# BIU ID Card Portal

Staff portal for producing ID cards at Benson Idahosa University for
**undergraduate students, postgraduate students and staff**: look the person
up (students by matric number from the student portal, staff by staff number
from the staff records), capture and clean up their photo, print the card on
the CR80 card printer, and keep a full record of who did what.

## Card categories

Every card belongs to one category, which is also its card design:

| Category      | Who                                     | Looked up by | Card design (as printed today)                              |
| ------------- | --------------------------------------- | ------------ | ----------------------------------------------------------- |
| Undergraduate | Students on non-postgraduate programmes | Matric no.   | NewCard.rpt: gold side bar, ribbon header, vertical STUDENT |
| Postgraduate  | Masters, PhD, PGDâ€¦ students           | Matric no.   | Serif header, blue name band, (MASTERS); NewCard back       |
| Staff         | Academic and non-academic staff         | Staff no.    | StaffCard2016.rpt: navy header, watermark, STAFF            |

Students are put in Undergraduate or Postgraduate automatically from their
programme (staff can change it on the record); staff always get the Staff card.

### The card designs

The designs match the cards the former ID card portal printed. Undergraduate
(NewCard.rpt) and Staff (StaffCard2016.rpt) are recreated element by element
from the Crystal Reports layouts extracted to `layout.json`: same positions
and sizes in millimetres, colours and rotations. Text is set in Lato, as on the
printed cards (the .rpt files name Windows fonts); Lato is bundled, so cards
look the same on every PC. The crest and gold ribbon on every card come from
the NewCard artwork, and photos have the printed cards' thin navy frame. The undergraduate card
shows a dot for the student type, as the old app did: gold for full time, navy
for part time, grey for diploma. The postgraduate front is not in the extracted
reports; it was recreated from a printed card (`pg-front.tsx`) and uses the
student back. Names print as on the old cards: "SURNAME / FIRSTNAME M.".

The barcodes are Code 39 (the old cards' Free 3 of 9) of the matric / staff
number. Student backs print the registrar's signature from the old template
until an administrator uploads the current one under Portal settings. Staff
backs print the holder's own signature, captured on the Capture page (signed
on screen or uploaded from a scan). Both are served only to signed-in staff.

To regenerate the designs from new specs, convert the `layout.json` files into
`resources/js/components/id-card/legacy/specs.ts` (positions are in mm).

Built with Laravel 13, Inertia + React 19, Tailwind 4 and Fortify, the same
stack as the other university portals.

## What it does

| Legacy menu item        | In the portal                                                                   |
| ----------------------- | ------------------------------------------------------------------------------- |
| Welcome Centre Search   | **Lookup**: Student (matric no.) or Staff (staff no.) â†’ card for this session |
| Basic Search            | **Card status** search box (matric / staff no, name, phone, e-mail)             |
| Card Processing Status  | **Card status**: by category, then Pending / Completed / All, per session       |
| Registration form       | **Record**: bio data or staff details, card details, photo, history             |
| Print Card              | **Print**: exact CR80 front + back, then "did it print correctly?"              |
| Encode                  | **Mark as encoded** on the record (after printing)                              |
| Records                 | **Records**: audit trail of every action, filterable, read-only                 |
| Generate Data Files     | **Generate data files**: CSV spreadsheet and ZIP of photos                      |
| Update Portal Pictures  | **Update portal pictures**: send new photos back to the student portal          |
| Download Picture File   | Record â†’ â‹¯ â†’ Download picture file                                        |
| Camera Settings         | **Camera settings**: per workstation (camera, resolution, engine)               |
| User Account / Settings | **User accounts** and **Portal settings** (administrators)                      |
| Exit                    | Sign out (user menu)                                                            |

Card statuses: **Awaiting photo** â†’ **Ready to print** â†’ **Printed**
("Pending" in the list covers the first two). Reprints need a reason and are
counted. Each student gets one card per session; earlier sessions are kept.

Two background-removal engines, both private:

- **Fast**: MediaPipe, runs in the operator's browser. Instant.
- **Offline**: rembg running on the portal server (UÂ²-Net human by default,
  ISNet or BiRefNet portrait optional). Photos go only to this server.

## Run it locally (Herd)

```bash
composer install
npm install            # also copies MediaPipe's runtime into public/mediapipe
npm run fetch-models   # the Fast engine's model, into public/models
cp .env.example .env && php artisan key:generate
php artisan migrate --seed
npm run rembg          # Offline engine, leave running (needs Python + rembg, below)
```

Herd serves it at **https://idcard-portal.test**. Use HTTPS: browsers only
allow the camera on HTTPS pages.

Seeded accounts (change the passwords straight away, or set
`SEED_ADMIN_PASSWORD` before seeding):

| Account              | Role          | Password        |
| -------------------- | ------------- | --------------- |
| admin@idcard.test    | Administrator | `ChangeMe!2026` |
| operator@idcard.test | Card operator | `ChangeMe!2026` |

With `STUDENT_DIRECTORY=demo` and `STAFF_DIRECTORY=demo` (the defaults) the
portal uses 48 **fictional** students and 24 fictional staff, and the seeder
adds sample cards in every category and state. Nothing in the demo data is a
real person.

## Connecting the real student portal

Set `STUDENT_DIRECTORY` in `.env` and fill in the matching block. No code
changes are needed.

**Same server, same database server** (recommended):

```dotenv
STUDENT_DIRECTORY=database
PORTAL_DB_HOST=127.0.0.1
PORTAL_DB_DATABASE=student_portal
PORTAL_DB_USERNAME=idcard_reader     # SELECT only
PORTAL_DB_PASSWORD=...
PORTAL_DB_TABLE=students
PORTAL_COL_MATRIC=matric_no          # map each column the portal uses
PORTAL_COL_SURNAME=surname
# ... see config/idcard.php for every PORTAL_COL_* key
PORTAL_DB_PHOTO_COLUMN=passport      # optional: enables "Update portal pictures"
```

Give the portal a database user with `SELECT` on the students table, plus
`UPDATE` on the photo column only if pictures should be written back.

**Over HTTP**: the student portal exposes `GET /students/{matric}` returning
JSON with the field names in `PortalRecord::FIELDS`, and optionally
`PUT /students/{matric}/photo` accepting `image/jpeg`:

```dotenv
STUDENT_DIRECTORY=http
PORTAL_API_URL=https://portal.biu.edu.ng/api
PORTAL_API_TOKEN=...
PORTAL_API_DATA_KEY=data
```

Bio data always stays owned by the student portal. The ID card portal keeps a
snapshot per student (refreshable from the record page) and only lets staff
correct card-specific details (student type, card design, validity, guardian).

## Connecting the staff records

Staff are configured separately, because they usually live in HR rather than
the student portal. Same options, `STAFF_` prefix:

```dotenv
STAFF_DIRECTORY=database
STAFF_DB_CONNECTION=portal          # or define another connection for the HR database
STAFF_DB_TABLE=staff
STAFF_COL_NUMBER=staff_no           # STAFF_COL_DESIGNATION, STAFF_COL_DEPARTMENT, ... in config/idcard.php
STAFF_DB_PHOTO_COLUMN=passport      # optional: photos sent back to the staff records
```

or `STAFF_DIRECTORY=http` with `STAFF_API_URL` / `STAFF_API_TOKEN`
(`GET /staff/{id}`, optional `PUT /staff/{id}/photo`). The JSON uses the same
field names, with the staff number as `id_number` or `staff_no`, plus
`designation` and `staff_category` (`academic`, `non_academic` or `contract`).

## Offline engine (rembg) on the server

```bash
# Python 3.12 or 3.13 (rembg does not support 3.14 yet)
python -m pip install "rembg[cpu,cli]"
python -c "from rembg.cli import main; main()" d u2net_human_seg isnet-general-use
npm run rembg          # 127.0.0.1:7000, one model in memory
```

Run it as a service (systemd / NSSM) in production. It must only listen on
`127.0.0.1`: browsers reach it through the portal (`/rembg/remove`, signed-in
staff only). `REMBG_URL` changes the address. Models used: UÂ²-Net and ISNet
(Apache-2.0), BiRefNet (MIT). rembg's own default, `bria-rmbg`, is
**non-commercial**, so the portal never accepts it. BiRefNet needs about 8 GB of RAM
and around 90 s per photo on a CPU; only enable it on a server with a GPU or
lots of memory.

## Data protection

- **Nothing leaves the university server.** A Content Security Policy
  restricts every page to this server (`connect-src 'self'`), fonts and models
  are self-hosted, and there are no CDN fallbacks.
- Photos are stored on a **private disk** (`storage/app/private/photos`) and
  served only to signed-in staff. Replaced photos are deleted.
- **No public sign-up or self-service password reset**: administrators create
  accounts, reset passwords and deactivate leavers (signed out immediately).
  Two-factor authentication and passkeys are available under Settings.
- **Every action is recorded** (who, what, when, IP): captures, prints,
  reprints with reason, downloads, exports, portal updates and deletions.
- Exports warn that they contain personal data; spreadsheet cells are
  protected against formula injection.
- Serve the portal over **HTTPS** only (cookies, camera, HSTS).

## Production checklist

- `APP_ENV=production`, `APP_DEBUG=false`, HTTPS `APP_URL`
- MySQL instead of SQLite (`DB_*`), and `STUDENT_DIRECTORY` connected
- `npm ci && npm run fetch-models && npm run build`, `php artisan migrate --force`
- rembg running as a service on 127.0.0.1
- Back up the database and `storage/app/private`
- Replace the placeholder crests in `public/brand` with the official artwork,
  and upload the registrar's signature under Portal settings

## Development

```bash
php artisan test        # Pest feature tests (portal flows, security, roles)
npx vp check            # lint + format (vp check --fix to format)
npx tsc --noEmit        # type check
vendor/bin/pint         # PHP style
```

Cards are drawn on a 540 Ã— 856 canvas (10 px per mm) in
`resources/js/components/id-card` (`legacy/specs.ts` holds the layouts,
`legacy/legacy-card.tsx` draws them). The capture and image code live in
`resources/js/lib/card-studio` and `resources/js/pages/cards/capture.tsx`.
