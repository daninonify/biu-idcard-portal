# BIU ID Card Portal

Staff portal for producing student ID cards at Benson Idahosa University:
look a student up by matric number (pulled from the student portal), capture
and clean up their photo, print the card on the CR80 card printer, and keep a
full record of who did what.

Built with Laravel 13, Inertia + React 19, Tailwind 4 and Fortify, the same
stack as the other university portals.

## What it does

| Legacy menu item          | In the portal                                                         |
| ------------------------- | --------------------------------------------------------------------- |
| Welcome Centre Search     | **Student lookup**: matric number → student portal → card for this session |
| Basic Search              | **Card status** search box (matric no, name, phone, e-mail)           |
| Card Processing Status    | **Card status**: Pending / Completed / All, per session              |
| Registration form         | **Student record**: bio data, card details, guardian, photo, history |
| Print Card                | **Print**: exact CR80 front + back, then "did it print correctly?"   |
| Encode                    | **Mark as encoded** on the record (after printing)                   |
| Records                   | **Records**: audit trail of every action, filterable, read-only      |
| Generate Data Files       | **Generate data files**: CSV spreadsheet and ZIP of photos           |
| Update Portal Pictures    | **Update portal pictures**: send new photos back to the student portal |
| Download Picture File     | Record → ⋯ → Download picture file                                    |
| Camera Settings           | **Camera settings**: per workstation (camera, resolution, engine)    |
| User Account / Settings   | **User accounts** and **Portal settings** (administrators)           |
| Exit                      | Sign out (user menu)                                                  |

Card statuses: **Awaiting photo** → **Ready to print** → **Printed**
("Pending" in the list covers the first two). Reprints need a reason and are
counted. Each student gets one card per session; earlier sessions are kept.

Two background-removal engines, both private:

- **Fast**: MediaPipe, runs in the operator's browser. Instant.
- **Offline**: rembg running on the portal server (U²-Net human by default,
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

| Account                | Role          | Password        |
| ---------------------- | ------------- | --------------- |
| admin@idcard.test      | Administrator | `ChangeMe!2026` |
| operator@idcard.test   | Card operator | `ChangeMe!2026` |

With `STUDENT_DIRECTORY=demo` (the default) the portal uses 48 **fictional**
students, and the seeder adds sample cards in every state. Nothing in the
demo data is a real person.

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

## Offline engine (rembg) on the server

```bash
# Python 3.12 or 3.13 (rembg does not support 3.14 yet)
python -m pip install "rembg[cpu,cli]"
python -c "from rembg.cli import main; main()" d u2net_human_seg isnet-general-use
npm run rembg          # 127.0.0.1:7000, one model in memory
```

Run it as a service (systemd / NSSM) in production. It must only listen on
`127.0.0.1`: browsers reach it through the portal (`/rembg/remove`, signed-in
staff only). `REMBG_URL` changes the address. Models used: U²-Net and ISNet
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

Cards are drawn on a 540 × 856 canvas (10 px per mm) in
`resources/js/components/id-card`. The capture and image code live in
`resources/js/lib/card-studio` and `resources/js/pages/cards/capture.tsx`.
