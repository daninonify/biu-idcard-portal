<?php

use App\Enums\CardStatus;
use App\Enums\CardTemplate;
use App\Models\CardEvent;
use App\Models\IdCard;
use App\Models\Setting;
use App\Models\User;
use App\Services\StudentDirectory\DemoDirectory;
use App\Services\StudentDirectory\PortalRecord;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;

beforeEach(function () {
    Storage::fake('local');
    config(['idcard.directory.driver' => 'demo', 'idcard.photo_disk' => 'local']);
    $this->operator = User::factory()->create();
    $this->matric = (new DemoDirectory)->matricNumbers()[0];
});

function jpeg(): UploadedFile
{
    $img = imagecreatetruecolor(60, 80);
    ob_start();
    imagejpeg($img);

    return UploadedFile::fake()->createWithContent('photo.jpg', (string) ob_get_clean());
}

function startCard(string $matric): IdCard
{
    test()->post(route('lookup.store'), ['matric_no' => strtolower($matric)])->assertRedirect();

    return IdCard::query()->latest('id')->firstOrFail();
}

it('keeps guests out of every staff page', function (string $route) {
    $this->get(route($route))->assertRedirect(route('login'));
})->with(['dashboard', 'lookup', 'cards.index', 'records', 'data-files', 'portal-pictures', 'camera-settings']);

it('has no public sign-up', function () {
    $this->get('/register')->assertNotFound();
});

it('blocks deactivated staff from signing in', function () {
    $user = User::factory()->deactivated()->create();

    $this->post(route('login.store'), ['email' => $user->email, 'password' => 'password'])
        ->assertSessionHasErrors('email');
    $this->assertGuest();
});

it('signs out staff deactivated mid-session', function () {
    $user = User::factory()->create();
    $this->actingAs($user)->get(route('dashboard'))->assertOk();

    $user->update(['is_active' => false]);
    $this->get(route('dashboard'))->assertRedirect(route('login'));
    $this->assertGuest();
});

it('renders every staff page for an operator', function (string $route) {
    $this->actingAs($this->operator)->get(route($route))->assertOk();
})->with(['dashboard', 'lookup', 'cards.index', 'records', 'data-files', 'portal-pictures', 'camera-settings']);

it('looks a student up on the portal and starts one card per session', function () {
    $this->actingAs($this->operator);

    $card = startCard($this->matric);
    startCard($this->matric); // second lookup reuses the card

    expect(IdCard::count())->toBe(1)
        ->and($card->status)->toBe(CardStatus::Pending)
        ->and($card->student->matric_no)->toBe($this->matric);

    $this->get(route('cards.show', $card))->assertOk()
        ->assertInertia(fn ($page) => $page->component('cards/show')->where('student.matric_no', $this->matric));
});

it('explains when the matric number is unknown', function () {
    $this->actingAs($this->operator)
        ->post(route('lookup.store'), ['matric_no' => 'XXX/000/000000'])
        ->assertSessionHasErrors('matric_no');
    expect(IdCard::count())->toBe(0);
});

it('picks the postgraduate card for masters and PhD programmes only', function () {
    expect(CardTemplate::forProgramme('M.Sc'))->toBe(CardTemplate::Postgraduate)
        ->and(CardTemplate::forProgramme('PhD'))->toBe(CardTemplate::Postgraduate)
        ->and(CardTemplate::forProgramme('B.Sc', 'Mass Communication'))->toBe(CardTemplate::Undergraduate)
        ->and(CardTemplate::forProgramme('Diploma'))->toBe(CardTemplate::Undergraduate);
});

it('normalises portal records', function () {
    $r = PortalRecord::fromArray(['matric_no' => ' scn/csc/ 230101', 'surname' => 'OKAFOR', 'first_name' => 'ada', 'student_type' => 'FULL TIME', 'date_of_birth' => '23/10/2005']);

    expect($r->matric())->toBe('SCN/CSC/230101')
        ->and($r->toArray()['surname'])->toBe('Okafor')
        ->and($r->toArray()['student_type'])->toBe('full_time');
});

it('saves the photo privately, then prints and logs everything', function () {
    $this->actingAs($this->operator);
    $card = startCard($this->matric);

    $this->post(route('cards.photo.store', $card), [
        'photo' => jpeg(),
        'engine' => 'rembg:u2net_human_seg',
        'framing' => json_encode(['zoom' => 1.1, 'offX' => 0, 'offY' => 0, 'head' => ['top' => 0.1, 'cx' => 0.5], 'background' => '#ffffff']),
        'next' => 'print',
    ])->assertRedirect(route('cards.print', $card));

    $card->refresh();
    expect($card->status)->toBe(CardStatus::Captured)
        ->and($card->framing['zoom'])->toBe(1.1);
    Storage::disk('local')->assertExists($card->photo_path);

    // photo is only served to signed-in staff
    $this->get(route('cards.photo', $card))->assertOk()->assertHeader('Content-Type', 'image/jpeg');

    $this->post(route('cards.printed', $card))->assertRedirect(route('cards.show', $card));
    expect($card->refresh()->status)->toBe(CardStatus::Printed)->and($card->print_count)->toBe(1);

    // reprints need a reason by default
    $this->post(route('cards.printed', $card))->assertSessionHasErrors('reason');
    $this->post(route('cards.printed', $card), ['reason' => 'Lost card'])->assertRedirect();
    expect($card->refresh()->print_count)->toBe(2);

    expect(CardEvent::pluck('action')->all())
        ->toContain('card_created', 'photo_captured', 'card_printed', 'card_reprinted');

    auth()->logout();
    $this->get(route('cards.photo', $card))->assertRedirect(route('login'));
});

it('rejects photos that are not JPEGs', function () {
    $this->actingAs($this->operator);
    $card = startCard($this->matric);

    $this->post(route('cards.photo.store', $card), [
        'photo' => UploadedFile::fake()->create('photo.png', 10, 'image/png'),
        'engine' => 'mediapipe',
        'framing' => '{}',
    ])->assertSessionHasErrors('photo');
});

it('refuses to print a card without a photo', function () {
    $this->actingAs($this->operator);
    $card = startCard($this->matric);

    $this->get(route('cards.print', $card))->assertRedirect(route('cards.capture', $card));
});

it('filters the card status list', function () {
    $this->actingAs($this->operator);
    startCard($this->matric);

    $this->get(route('cards.index', ['status' => 'completed']))
        ->assertInertia(fn ($page) => $page->where('totals.pending', 1)->where('totals.completed', 0)->has('cards.data', 0));
    $this->get(route('cards.index', ['status' => 'pending', 'q' => substr($this->matric, 0, 7)]))
        ->assertInertia(fn ($page) => $page->has('cards.data', 1));
});

it('sends photos to the student portal', function () {
    $this->actingAs($this->operator);
    $card = startCard($this->matric);
    $this->post(route('cards.photo.store', $card), ['photo' => jpeg(), 'engine' => 'mediapipe', 'framing' => '{}']);

    $this->post(route('portal-pictures.store'), ['cards' => [$card->id]])->assertRedirect();

    expect($card->refresh()->portal_photo_synced_at)->not->toBeNull();
    Storage::disk('local')->assertExists('demo-portal/'.str_replace('/', '-', $this->matric).'.jpg');
});

it('exports a spreadsheet and records the export', function () {
    $this->actingAs($this->operator);
    startCard($this->matric);

    $res = $this->get(route('data-files.download', ['format' => 'csv', 'session' => Setting::get('session'), 'status' => 'all']));
    $res->assertOk();
    expect($res->streamedContent())->toContain('Matric No')->toContain($this->matric);
    expect(CardEvent::where('action', 'data_exported')->exists())->toBeTrue();
});

it('proxies the Offline engine and explains when rembg is down', function () {
    $this->actingAs($this->operator);
    Http::fake(['*/api/remove' => Http::response('PNGDATA', 200, ['Content-Type' => 'image/png'])]);

    $this->post(route('rembg.remove'), ['file' => jpeg(), 'model' => 'u2net_human_seg'])
        ->assertOk()->assertHeader('Content-Type', 'image/png');
    // rembg's non-commercial default model is never allowed through
    $this->post(route('rembg.remove'), ['file' => jpeg(), 'model' => 'bria-rmbg'], ['Accept' => 'application/json'])
        ->assertUnprocessable();

    Http::fake(fn () => throw new ConnectionException('down'));
    $this->post(route('rembg.remove'), ['file' => jpeg(), 'model' => 'u2net_human_seg'])->assertStatus(503);
});

it('limits user accounts and settings to administrators', function () {
    $this->actingAs($this->operator)->get(route('admin.users.index'))->assertForbidden();
    $this->actingAs($this->operator)->get(route('admin.settings.edit'))->assertForbidden();
    $this->actingAs($this->operator)->delete(route('cards.destroy', startCard($this->matric)))->assertForbidden();

    $admin = User::factory()->admin()->create();
    $this->actingAs($admin)->get(route('admin.users.index'))->assertOk();

    $this->post(route('admin.users.store'), [
        'name' => 'New Operator', 'email' => 'NEW@biu.test', 'role' => 'operator',
        'password' => 'Secret!2026pw', 'password_confirmation' => 'Secret!2026pw',
    ])->assertRedirect();
    expect(User::where('email', 'new@biu.test')->exists())->toBeTrue();

    // an admin cannot lock themselves out
    $this->patch(route('admin.users.update', $admin), ['name' => $admin->name, 'email' => $admin->email, 'role' => 'operator', 'is_active' => true])
        ->assertSessionHasErrors('role');
});

it('sends strict security headers', function () {
    $res = $this->actingAs($this->operator)->get(route('dashboard'));

    expect($res->headers->get('Content-Security-Policy'))
        ->toContain("connect-src 'self'")
        ->toContain("frame-ancestors 'none'")
        ->and($res->headers->get('X-Frame-Options'))->toBe('DENY');
});
