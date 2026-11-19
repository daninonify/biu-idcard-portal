<?php

return [

    /*
    | Institution details printed on cards and shown in the portal.
    */
    'institution' => [
        'name' => env('IDCARD_INSTITUTION', 'Benson Idahosa University'),
        'short' => env('IDCARD_INSTITUTION_SHORT', 'BIU'),
    ],

    /*
    | Where student records come from, looked up by matriculation number.
    |
    | demo      Fictional students (for testing; no real data).
    | database  Read-only connection to the student portal's database
    |           (best when this portal is hosted on the same server).
    | http      The student portal's HTTP API.
    */
    'directory' => [
        'driver' => env('STUDENT_DIRECTORY', 'demo'),

        'database' => [
            'connection' => env('PORTAL_DB_CONNECTION', 'portal'),
            'table' => env('PORTAL_DB_TABLE', 'students'),
            'photo_table' => env('PORTAL_DB_PHOTO_TABLE'),        // null = photo column on the students table
            'photo_column' => env('PORTAL_DB_PHOTO_COLUMN'),      // null = updating portal pictures is disabled
            // portal column => portal-agnostic field used by this app
            'columns' => [
                'matric_no' => env('PORTAL_COL_MATRIC', 'matric_no'),
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
            ],
        ],

        'http' => [
            'base_url' => env('PORTAL_API_URL'),
            'token' => env('PORTAL_API_TOKEN'),
            'lookup_path' => env('PORTAL_API_LOOKUP_PATH', '/students/{matric}'),
            'photo_path' => env('PORTAL_API_PHOTO_PATH', '/students/{matric}/photo'),
            'timeout' => (int) env('PORTAL_API_TIMEOUT', 10),
            // Dot path inside the JSON response that holds the student object (empty = root)
            'data_key' => env('PORTAL_API_DATA_KEY', 'data'),
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
