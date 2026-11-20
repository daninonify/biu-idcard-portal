<?php

use App\Enums\CardStatus;
use App\Enums\CardTemplate;
use App\Enums\HolderType;
use App\Models\CardEvent;
use App\Models\IdCard;
use App\Models\Setting;
use App\Models\User;
use App\Services\Directory\DemoDirectory;
use App\Services\Directory\PortalRecord;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;

beforeEach(function () {
    Storage::fake('local');
    config(['idcard.directory.student.driver' => 'demo', 'idcard.directory.staff.driver' => 'demo', 'idcard.photo_disk' => 'local']);
    $this->operator = User::factory()->create();
    $this->matric = (new DemoDirectory(HolderType::Student))->idNumbers()[0];
    $this->staffNo = (new DemoDirectory(HolderType::Staff))->idNumbers()[0];
});

function jpeg(): UploadedFile
{
    $img = imagecreatetruecolor(60, 80);
    ob_start();
    imagejpeg($img);

    return UploadedFile::fake()->createWithContent('photo.jpg', (string) ob_get_clean());
}

function startCard(string $number, string $type = 'student'): IdCard
{
    test()->post(route('lookup.store'), ['type' => $type, 'id_number' => strtolower($number)])->assertRedirect();

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
        ->and($card->cardholder->id_number)->toBe($this->matric)
        ->and($card->template)->toBe(CardTemplate::Undergraduate);

    $this->get(route('cards.show', $card))->assertOk()
        ->assertInertia(fn ($page) => $page->component('cards/show')->where('holder.id_number', $this->matric)->where('holder.type', 'student'));
});

it('explains when the matric number is unknown', function () {
    $this->actingAs($this->operator)
        ->post(route('lookup.store'), ['type' => 'student', 'id_number' => 'XXX/000/000000'])
        ->assertSessionHasErrors('id_number');
    expect(IdCard::count())->toBe(0);
});

it('picks the postgraduate card for masters and PhD programmes only', function () {
    expect(CardTemplate::forProgramme('M.Sc'))->toBe(CardTemplate::Postgraduate)
        ->and(CardTemplate::forProgramme('PhD'))->toBe(CardTemplate::Postgraduate)
        ->and(CardTemplate::forProgramme('B.Sc', 'Mass Communication'))->toBe(CardTemplate::Undergraduate)
        ->and(CardTemplate::forProgramme('Diploma'))->toBe(CardTemplate::Undergraduate);
});

it('normalises portal records', function () {
    $r = PortalRecord::fromArray(['id_number' => ' scn/csc/ 230101', 'surname' => 'OKAFOR', 'first_name' => 'ada', 'student_type' => 'FULL TIME', 'date_of_birth' => '23/10/2005']);

    expect($r->idNumber())->toBe('SCN/CSC/230101')
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
    Storage::disk('local')->assertExists('demo-portal/student/'.str_replace('/', '-', $this->matric).'.jpg');
});

it('exports a spreadsheet and records the export', function () {
    $this->actingAs($this->operator);
    startCard($this->matric);

    $res = $this->get(route('data-files.download', ['format' => 'csv', 'session' => Setting::get('session'), 'category' => 'all', 'status' => 'all']));
    $res->assertOk();
    expect($res->streamedContent())->toContain('ID Number')->toContain('Undergraduate')->toContain($this->matric);
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

it('looks staff up by staff number and gives them a staff card', function () {
    $this->actingAs($this->operator);

    $card = startCard($this->staffNo, 'staff');

    expect($card->template)->toBe(CardTemplate::Staff)
        ->and($card->cardholder->type)->toBe(HolderType::Staff)
        ->and($card->cardholder->designation)->not->toBeNull()
        ->and($card->cardholder->programme)->toBeNull();

    $this->get(route('cards.show', $card))
        ->assertInertia(fn ($page) => $page->where('holder.type', 'staff')->where('card.template', 'staff')
            ->has('options.templates', 1));

    // a staff number is not a student, and vice versa
    $this->post(route('lookup.store'), ['type' => 'student', 'id_number' => $this->staffNo])->assertSessionHasErrors('id_number');
    $this->post(route('lookup.store'), ['type' => 'staff', 'id_number' => $this->matric])->assertSessionHasErrors('id_number');
});

it('keeps staff cards in the staff category', function () {
    $this->actingAs($this->operator);
    $card = startCard($this->staffNo, 'staff');

    $this->patch(route('cards.update', $card), ['template' => 'ug'])->assertSessionHasErrors('template');
    $this->patch(route('cards.update', $card), ['template' => 'staff', 'designation' => 'Dean', 'staff_category' => 'academic'])
        ->assertSessionHasNoErrors();

    expect($card->cardholder->refresh()->designation)->toBe('Dean');
});

it('arranges the card list by category', function () {
    $this->actingAs($this->operator);
    startCard($this->matric);
    startCard($this->staffNo, 'staff');

    $this->get(route('cards.index', ['category' => 'staff', 'status' => 'all']))
        ->assertInertia(fn ($page) => $page->has('cards.data', 1)
            ->where('cards.data.0.category', 'staff')
            ->where('cards.data.0.id_number', $this->staffNo)
            ->where('categories.0.count', 2)       // all
            ->where('categories.3.value', 'staff')
            ->where('categories.3.count', 1));

    $this->get(route('cards.index', ['category' => 'ug', 'status' => 'all']))
        ->assertInertia(fn ($page) => $page->has('cards.data', 1)->where('cards.data.0.category', 'ug'));
});

it('filters records and exports by category', function () {
    $this->actingAs($this->operator);
    startCard($this->matric);
    startCard($this->staffNo, 'staff');

    $this->get(route('records', ['category' => 'staff']))
        ->assertInertia(fn ($page) => $page->where('events.data.0.category', 'staff')->where('events.total', 1));

    $csv = $this->get(route('data-files.download', ['format' => 'csv', 'session' => Setting::get('session'), 'category' => 'staff', 'status' => 'all']))
        ->streamedContent();
    expect($csv)->toContain($this->staffNo)->not->toContain($this->matric)->toContain('Staff');
});

it('sends staff photos to the staff records', function () {
    $this->actingAs($this->operator);
    $card = startCard($this->staffNo, 'staff');
    $this->post(route('cards.photo.store', $card), ['photo' => jpeg(), 'engine' => 'mediapipe', 'framing' => '{}']);

    $this->post(route('portal-pictures.store'), ['cards' => [$card->id]])->assertRedirect();

    Storage::disk('local')->assertExists('demo-portal/staff/'.str_replace('/', '-', $this->staffNo).'.jpg');
    expect(CardEvent::where('action', 'portal_photo_updated')->value('description'))->toContain('staff records');
});

function png(int $w = 300, int $h = 100): UploadedFile
{
    $img = imagecreatetruecolor($w, $h);
    imagesavealpha($img, true);
    imagefill($img, 0, 0, imagecolorallocatealpha($img, 0, 0, 0, 127));
    imageline($img, 10, 50, $w - 10, 40, imagecolorallocate($img, 20, 20, 40));
    ob_start();
    imagepng($img);

    return UploadedFile::fake()->createWithContent('signature.png', (string) ob_get_clean());
}

it('captures the staff member\'s own signature for the card back', function () {
    $this->actingAs($this->operator);
    $card = startCard($this->staffNo, 'staff');

    $this->post(route('cards.signature.store', $card), ['signature' => jpeg()])->assertSessionHasErrors('signature');
    $this->post(route('cards.signature.store', $card), ['signature' => png()])->assertSessionHasNoErrors();

    $holder = $card->cardholder->refresh();
    Storage::disk('local')->assertExists($holder->signature_path);
    $this->get(route('cards.signature', $card))->assertOk()->assertHeader('Content-Type', 'image/png');

    // the print page hands the signature to the card template
    $this->post(route('cards.photo.store', $card), ['photo' => jpeg(), 'engine' => 'mediapipe', 'framing' => '{}']);
    $this->get(route('cards.print', $card))
        ->assertInertia(fn ($page) => $page->where('signatures.holder', fn ($url) => str_contains((string) $url, '/signature')));

    $this->delete(route('cards.signature.destroy', $card))->assertRedirect();
    expect($holder->refresh()->signature_path)->toBeNull();
    expect(CardEvent::where('action', 'signature_captured')->exists())->toBeTrue();

    auth()->logout();
    $this->get(route('cards.signature', $card))->assertRedirect(route('login'));
});

it('prints the old templates\' registrar signatures until one is uploaded', function () {
    $this->actingAs($this->operator);
    $card = startCard($this->matric);

    $this->get(route('signatures.legacy', 'a'))->assertOk()->assertHeader('Content-Type', 'image/png');
    $this->get(route('signatures.legacy', 'b'))->assertOk();
    $this->get('/signatures/legacy/z')->assertNotFound();

    $this->get(route('cards.show', $card))
        ->assertInertia(fn ($page) => $page->where('signatures.registrar', null)
            ->where('signatures.legacy.a', route('signatures.legacy', 'a')));

    Setting::put('registrar_signature', 'branding/new.png');
    $this->get(route('cards.show', $card))
        ->assertInertia(fn ($page) => $page->whereNot('signatures.registrar', null));

    auth()->logout();
    $this->get(route('signatures.legacy', 'a'))->assertRedirect(route('login'));
});
