<?php

namespace App\Services\StudentDirectory;

use Illuminate\Support\Facades\Storage;

/**
 * Fictional students for trying the portal without a real student portal.
 * Every name, number and address here is made up.
 */
class DemoDirectory implements StudentDirectory
{
    /** faculty => [department => matric prefix] */
    private const FACULTIES = [
        'Basic and Applied Sciences' => ['Computer Science' => 'SCN/CSC', 'Microbiology' => 'SCN/MCB', 'Industrial Chemistry' => 'SCN/ICH'],
        'Basic Medical and Health Sciences' => ['Nursing Science' => 'BMH/NUR', 'Medical Laboratory Science' => 'BMH/MLS'],
        'Social and Management Sciences' => ['Accounting' => 'SMS/ACC', 'Business Administration' => 'SMS/BUS', 'Political Science' => 'SMS/POL', 'Mass Communication' => 'SMS/MAC'],
        'Arts and Education' => ['English and Literary Studies' => 'ART/ENG', 'Theatre Arts' => 'ART/THA'],
        'Law' => ['Law' => 'LAW/LAW'],
    ];

    private const SURNAMES = ['Adebanjo', 'Okonkwo', 'Ehigiator', 'Osagie', 'Nwachukwu', 'Igbinedion', 'Eze', 'Omoruyi', 'Bello', 'Okafor', 'Uwaifo', 'Adeyemi', 'Ekanem', 'Obi', 'Idahor', 'Akpan', 'Ogbeide', 'Usman', 'Ighodaro', 'Ibe'];

    private const FIRST = [
        'F' => ['Adaeze', 'Osarumen', 'Temitope', 'Chiamaka', 'Efosa', 'Ivie', 'Funmilayo', 'Nneka', 'Ese', 'Oluwaseun'],
        'M' => ['Chukwuemeka', 'Osaze', 'Tobiloba', 'Ikenna', 'Eghosa', 'Uyi', 'Babatunde', 'Obinna', 'Osas', 'Kelechi'],
    ];

    private const STATES = ['Edo' => ['Oredo', 'Egor', 'Ikpoba-Okha', 'Ovia North-East'], 'Delta' => ['Oshimili South', 'Warri South'], 'Lagos' => ['Ikeja', 'Surulere'], 'Anambra' => ['Awka South', 'Onitsha North']];

    public function name(): string
    {
        return 'Demo students (fictional)';
    }

    public function find(string $matricNo): ?PortalRecord
    {
        $matric = PortalRecord::normaliseMatric($matricNo);

        foreach ($this->all() as $student) {
            if ($student['matric_no'] === $matric) {
                return PortalRecord::fromArray($student);
            }
        }

        return null;
    }

    public function supportsPhotoUpdate(): bool
    {
        return true;
    }

    public function updatePhoto(string $matricNo, string $jpeg): void
    {
        $file = 'demo-portal/'.str_replace('/', '-', PortalRecord::normaliseMatric($matricNo)).'.jpg';
        Storage::disk(config('idcard.photo_disk'))->put($file, $jpeg);
    }

    /**
     * Matric numbers of every demo student, for seeding and hints.
     *
     * @return list<string>
     */
    public function matricNumbers(): array
    {
        return array_column($this->all(), 'matric_no');
    }

    /** @return list<array<string, string>> 48 deterministic students */
    public function all(): array
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
            $sex = $i % 2 ? 'M' : 'F';
            $first = self::FIRST[$sex][mt_rand(0, 9)];
            $middle = self::FIRST[$sex][mt_rand(0, 9)];
            $surname = self::SURNAMES[mt_rand(0, count(self::SURNAMES) - 1)];
            $entry = [22, 23, 24, 25, 26][$i % 5];
            $pg = $i % 9 === 4;
            $state = array_keys(self::STATES)[$i % 4];
            $lgas = self::STATES[$state];
            $type = $pg ? 'full_time' : ['full_time', 'full_time', 'full_time', 'part_time', 'diploma'][$i % 5];

            $students[] = [
                'matric_no' => sprintf('%s/%02d%04d', $prefix, $entry, 100 + $i * 7),
                'surname' => $surname,
                'first_name' => $first,
                'middle_name' => $middle === $first ? null : $middle,
                'email' => strtolower($first.'.'.$surname.($i + 10)).'@students.example.edu.ng',
                'phone' => sprintf('080%08d', 10000000 + $i * 1234567 % 89999999),
                'date_of_birth' => sprintf('%04d-%02d-%02d', 1999 + $i % 8, 1 + $i % 12, 1 + ($i * 3) % 28),
                'sex' => $sex === 'F' ? 'Female' : 'Male',
                'country' => 'Nigeria',
                'state' => $state,
                'lga' => $lgas[$i % count($lgas)],
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
}
