<?php

namespace App\Services\Directory;

use App\Enums\HolderType;
use Illuminate\Support\Facades\Storage;

/**
 * Fictional students and staff for trying the portal without the real
 * systems. Every name, number and address here is made up.
 */
class DemoDirectory implements PeopleDirectory
{
    /** faculty => [department => matric prefix] */
    private const FACULTIES = [
        'Basic and Applied Sciences' => ['Computer Science' => 'SCN/CSC', 'Microbiology' => 'SCN/MCB', 'Industrial Chemistry' => 'SCN/ICH'],
        'Basic Medical and Health Sciences' => ['Nursing Science' => 'BMH/NUR', 'Medical Laboratory Science' => 'BMH/MLS'],
        'Social and Management Sciences' => ['Accounting' => 'SMS/ACC', 'Business Administration' => 'SMS/BUS', 'Political Science' => 'SMS/POL', 'Mass Communication' => 'SMS/MAC'],
        'Arts and Education' => ['English and Literary Studies' => 'ART/ENG', 'Theatre Arts' => 'ART/THA'],
        'Law' => ['Law' => 'LAW/LAW'],
    ];

    /** [designation, faculty/directorate, department/unit, category] */
    private const STAFF_ROLES = [
        ['Professor', 'Basic and Applied Sciences', 'Computer Science', 'academic'],
        ['Senior Lecturer', 'Social and Management Sciences', 'Accounting', 'academic'],
        ['Lecturer I', 'Basic Medical and Health Sciences', 'Nursing Science', 'academic'],
        ['Lecturer II', 'Law', 'Law', 'academic'],
        ['Assistant Lecturer', 'Arts and Education', 'Theatre Arts', 'academic'],
        ['Senior Registry Officer', 'Registry', 'Academic Affairs', 'non_academic'],
        ['Bursary Officer', 'Bursary', 'Student Accounts', 'non_academic'],
        ['Librarian II', 'University Library', 'Readers Services', 'non_academic'],
        ['Senior Technologist', 'Basic and Applied Sciences', 'Microbiology', 'non_academic'],
        ['ICT Officer', 'ICT Directorate', 'Systems and Networks', 'non_academic'],
        ['Chief Security Officer', 'Works and Services', 'Security Unit', 'non_academic'],
        ['Executive Officer', 'Vice-Chancellor\'s Office', 'Protocol', 'non_academic'],
    ];

    private const SURNAMES = ['Adebanjo', 'Okonkwo', 'Ehigiator', 'Osagie', 'Nwachukwu', 'Igbinedion', 'Eze', 'Omoruyi', 'Bello', 'Okafor', 'Uwaifo', 'Adeyemi', 'Ekanem', 'Obi', 'Idahor', 'Akpan', 'Ogbeide', 'Usman', 'Ighodaro', 'Ibe'];

    private const FIRST = [
        'F' => ['Adaeze', 'Osarumen', 'Temitope', 'Chiamaka', 'Efosa', 'Ivie', 'Funmilayo', 'Nneka', 'Ese', 'Oluwaseun'],
        'M' => ['Chukwuemeka', 'Osaze', 'Tobiloba', 'Ikenna', 'Eghosa', 'Uyi', 'Babatunde', 'Obinna', 'Osas', 'Kelechi'],
    ];

    private const STATES = ['Edo' => ['Oredo', 'Egor', 'Ikpoba-Okha', 'Ovia North-East'], 'Delta' => ['Oshimili South', 'Warri South'], 'Lagos' => ['Ikeja', 'Surulere'], 'Anambra' => ['Awka South', 'Onitsha North']];

    public function __construct(private readonly HolderType $type = HolderType::Student) {}

    public function type(): HolderType
    {
        return $this->type;
    }

    public function name(): string
    {
        return $this->type === HolderType::Staff ? 'Demo staff (fictional)' : 'Demo students (fictional)';
    }

    public function find(string $idNumber): ?PortalRecord
    {
        $id = PortalRecord::normaliseId($idNumber);

        foreach ($this->all() as $person) {
            if ($person['id_number'] === $id) {
                return PortalRecord::fromArray($person);
            }
        }

        return null;
    }

    public function supportsPhotoUpdate(): bool
    {
        return true;
    }

    public function updatePhoto(string $idNumber, string $jpeg): void
    {
        $file = 'demo-portal/'.$this->type->value.'/'.str_replace('/', '-', PortalRecord::normaliseId($idNumber)).'.jpg';
        Storage::disk(config('idcard.photo_disk'))->put($file, $jpeg);
    }

    /** @return list<string> ID numbers of every demo person of this type */
    public function idNumbers(): array
    {
        return array_column($this->all(), 'id_number');
    }

    /** @return list<array<string, string|null>> */
    public function all(): array
    {
        return $this->type === HolderType::Staff ? self::staff() : self::students();
    }

    /** @return list<array<string, string|null>> 48 deterministic students */
    private static function students(): array
    {
        static $cache = null;
        if ($cache !== null) {
            return $cache;
        }

        mt_srand(20261119);
        $depts = [];
        foreach (self::FACULTIES as $faculty => $list) {
            foreach ($list as $dept => $prefix) {
                $depts[] = [$faculty, $dept, $prefix];
            }
        }

        $students = [];
        for ($i = 0; $i < 48; $i++) {
            [$faculty, $dept, $prefix] = $depts[$i % count($depts)];
            [$sex, $first, $middle, $surname] = self::person($i);
            $entry = [22, 23, 24, 25, 26][$i % 5];
            $pg = $i % 9 === 4;
            [$state, $lga] = self::origin($i);
            $type = $pg ? 'full_time' : ['full_time', 'full_time', 'full_time', 'part_time', 'diploma'][$i % 5];

            $students[] = [
                'id_number' => sprintf('%s/%02d%04d', $prefix, $entry, 100 + $i * 7),
                'surname' => $surname,
                'first_name' => $first,
                'middle_name' => $middle,
                'email' => strtolower($first.'.'.$surname.($i + 10)).'@students.example.edu.ng',
                'phone' => sprintf('080%08d', 10000000 + $i * 1234567 % 89999999),
                'date_of_birth' => sprintf('%04d-%02d-%02d', 1999 + $i % 8, 1 + $i % 12, 1 + ($i * 3) % 28),
                'sex' => $sex === 'F' ? 'Female' : 'Male',
                'country' => 'Nigeria',
                'state' => $state,
                'lga' => $lga,
                'address' => (10 + $i).' Example Crescent, GRA, Benin City',
                'faculty' => $faculty,
                'department' => $dept,
                'programme' => $pg ? ($i % 2 ? 'M.Sc' : 'PhD') : ($type === 'diploma' ? 'Diploma' : 'B.Sc'),
                'level' => $pg ? 'Postgraduate' : (string) ((27 - $entry) * 100),
                'student_type' => $type,
                'graduation_year' => (string) (2000 + $entry + ($pg ? 2 : 4)),
                'guardian_name' => 'Mr & Mrs '.$surname,
                'guardian_phone' => sprintf('070%08d', 20000000 + $i * 7654321 % 79999999),
                'guardian_address' => (10 + $i).' Example Crescent, GRA, Benin City',
            ];
        }

        return $cache = $students;
    }

    /** @return list<array<string, string|null>> 24 deterministic staff */
    private static function staff(): array
    {
        static $cache = null;
        if ($cache !== null) {
            return $cache;
        }

        mt_srand(20261120);
        $staff = [];
        for ($i = 0; $i < 24; $i++) {
            [$designation, $faculty, $dept, $category] = self::STAFF_ROLES[$i % count(self::STAFF_ROLES)];
            [$sex, $first, $middle, $surname] = self::person($i + 100);
            [$state, $lga] = self::origin($i + 1);

            $staff[] = [
                'id_number' => sprintf('BIU/%s/%04d', $category === 'academic' ? 'AC' : 'NA', 150 + $i * 13),
                'surname' => $surname,
                'first_name' => $first,
                'middle_name' => $middle,
                'email' => strtolower(substr($first, 0, 1).$surname.($i + 1)).'@staff.example.edu.ng',
                'phone' => sprintf('081%08d', 30000000 + $i * 3456789 % 69999999),
                'date_of_birth' => sprintf('%04d-%02d-%02d', 1965 + $i % 25, 1 + $i % 12, 1 + ($i * 5) % 28),
                'sex' => $sex === 'F' ? 'Female' : 'Male',
                'country' => 'Nigeria',
                'state' => $state,
                'lga' => $lga,
                'address' => (40 + $i).' Example Avenue, Ugbor, Benin City',
                'faculty' => $faculty,
                'department' => $dept,
                'designation' => $designation,
                'staff_category' => $category,
            ];
        }

        return $cache = $staff;
    }

    /** @return array{0: string, 1: string, 2: string|null, 3: string} sex, first, middle, surname */
    private static function person(int $i): array
    {
        $sex = $i % 2 ? 'M' : 'F';
        $first = self::FIRST[$sex][mt_rand(0, 9)];
        $middle = self::FIRST[$sex][mt_rand(0, 9)];
        $surname = self::SURNAMES[mt_rand(0, count(self::SURNAMES) - 1)];

        return [$sex, $first, $middle === $first ? null : $middle, $surname];
    }

    /** @return array{0: string, 1: string} state, LGA */
    private static function origin(int $i): array
    {
        $state = array_keys(self::STATES)[$i % 4];
        $lgas = self::STATES[$state];

        return [$state, $lgas[$i % count($lgas)]];
    }
}
