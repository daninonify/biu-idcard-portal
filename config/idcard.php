<?php

/*
| Column / field maps: this app's field => the source system's column name.
| Only set the env vars that differ from the defaults.
*/
$studentColumns = [
    'id_number' => env('PORTAL_COL_MATRIC', 'matric_no'),
    'surname' => env('PORTAL_COL_SURNAME', 'surname'),
    'first_name' => env('PORTAL_COL_FIRST_NAME', 'first_name'),
    'middle_name' => env('PORTAL_COL_MIDDLE_NAME', 'middle_name'),
    'email' => env('PORTAL_COL_EMAIL', 'email'),
    'phone' => env('PORTAL_COL_PHONE', 'phone'),
    'date_of_birth' => env('PORTAL_COL_DOB', 'date_of_birth'),
    'sex' => env('PORTAL_COL_SEX', 'sex'),
    'country' => env('PORTAL_COL_COUNTRY', 'country'),
    'state' => env('PORTAL_COL_STATE', 'state'),
    'lga' => env('PORTAL_COL_LGA', 'lga'),
    'address' => env('PORTAL_COL_ADDRESS', 'contact_address'),
    'faculty' => env('PORTAL_COL_FACULTY', 'faculty'),
    'department' => env('PORTAL_COL_DEPARTMENT', 'department'),
    'programme' => env('PORTAL_COL_PROGRAMME', 'programme'),
    'level' => env('PORTAL_COL_LEVEL', 'level'),
    'student_type' => env('PORTAL_COL_STUDENT_TYPE', 'student_type'),
    'graduation_year' => env('PORTAL_COL_GRADUATION_YEAR', 'graduation_year'),
    'guardian_name' => env('PORTAL_COL_GUARDIAN_NAME', 'guardian_name'),
    'guardian_phone' => env('PORTAL_COL_GUARDIAN_PHONE', 'guardian_phone'),
    'guardian_address' => env('PORTAL_COL_GUARDIAN_ADDRESS', 'guardian_address'),
];

$staffColumns = [
    'id_number' => env('STAFF_COL_NUMBER', 'staff_no'),
    'surname' => env('STAFF_COL_SURNAME', 'surname'),
    'first_name' => env('STAFF_COL_FIRST_NAME', 'first_name'),
    'middle_name' => env('STAFF_COL_MIDDLE_NAME', 'middle_name'),
    'email' => env('STAFF_COL_EMAIL', 'email'),
    'phone' => env('STAFF_COL_PHONE', 'phone'),
    'date_of_birth' => env('STAFF_COL_DOB', 'date_of_birth'),
    'sex' => env('STAFF_COL_SEX', 'sex'),
    'address' => env('STAFF_COL_ADDRESS', 'address'),
    'faculty' => env('STAFF_COL_FACULTY', 'faculty'),
    'department' => env('STAFF_COL_DEPARTMENT', 'department'),
    'designation' => env('STAFF_COL_DESIGNATION', 'designation'),
    'staff_category' => env('STAFF_COL_CATEGORY', 'staff_category'),
];

return [

    /*
    | Institution details printed on cards and shown in the portal.
    */
    'institution' => [
        'name' => env('IDCARD_INSTITUTION', 'Benson Idahosa University'),
        'short' => env('IDCARD_INSTITUTION_SHORT', 'BIU'),
    ],

    /*
    | Where cardholders come from. Students and staff are configured separately
    | because they usually live in different systems (student portal vs HR).
    |
    | demo      Fictional people (for testing; no real data).
    | database  Read-only connection to the source database.
    | http      The source system's HTTP API.
    */
    'directory' => [
        'student' => [
            'driver' => env('STUDENT_DIRECTORY', 'demo'),
            'label' => 'student portal',
            'database' => [
                'connection' => env('PORTAL_DB_CONNECTION', 'portal'),
                'table' => env('PORTAL_DB_TABLE', 'students'),
                'photo_table' => env('PORTAL_DB_PHOTO_TABLE'),
                'photo_column' => env('PORTAL_DB_PHOTO_COLUMN'),
                'columns' => $studentColumns,
            ],
            'http' => [
                'base_url' => env('PORTAL_API_URL'),
                'token' => env('PORTAL_API_TOKEN'),
                'lookup_path' => env('PORTAL_API_LOOKUP_PATH', '/students/{id}'),
                'photo_path' => env('PORTAL_API_PHOTO_PATH', '/students/{id}/photo'),
                'timeout' => (int) env('PORTAL_API_TIMEOUT', 10),
                'data_key' => env('PORTAL_API_DATA_KEY', 'data'),
            ],
        ],

        'staff' => [
            'driver' => env('STAFF_DIRECTORY', 'demo'),
            'label' => 'staff records',
            'database' => [
                // Often the same server as the student portal; a separate HR database works too.
                'connection' => env('STAFF_DB_CONNECTION', 'portal'),
                'table' => env('STAFF_DB_TABLE', 'staff'),
                'photo_table' => env('STAFF_DB_PHOTO_TABLE'),
                'photo_column' => env('STAFF_DB_PHOTO_COLUMN'),
                'columns' => $staffColumns,
            ],
            'http' => [
                'base_url' => env('STAFF_API_URL'),
                'token' => env('STAFF_API_TOKEN'),
                'lookup_path' => env('STAFF_API_LOOKUP_PATH', '/staff/{id}'),
                'photo_path' => env('STAFF_API_PHOTO_PATH', '/staff/{id}/photo'),
                'timeout' => (int) env('STAFF_API_TIMEOUT', 10),
                'data_key' => env('STAFF_API_DATA_KEY', 'data'),
            ],
        ],
    ],

    /*
    | Background removal on the server (the "Offline" engine). rembg must listen
    | on this address; browsers never reach it directly, only through the portal.
    */
    'rembg' => [
        'url' => env('REMBG_URL', 'http://127.0.0.1:7000'),
        'timeout' => (int) env('REMBG_TIMEOUT', 180),
        'models' => ['u2net_human_seg', 'isnet-general-use', 'birefnet-portrait'],
    ],

    /*
    | Captured photos are stored on this (private) disk.
    */
    'photo_disk' => env('IDCARD_PHOTO_DISK', 'local'),

];
