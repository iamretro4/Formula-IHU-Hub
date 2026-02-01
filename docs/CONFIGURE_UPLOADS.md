# How to configure uploads

This guide covers configuring the **Upload Required Documents** feature: where files are stored, which documents appear on the dashboard, and optional Google Drive sync.

---

## 1. Supabase (required)

Uploads use the **Supabase Storage** bucket `team-uploads` and the **`team_uploads`** table. These are created by migrations.

- **Bucket**: `team-uploads` (private, 50 MB per file) — see `supabase/migrations/016_team_uploads_storage_bucket.sql`.
- **RLS**: Users can only read/write files under their team path: `{team_id}/{document_key}/{filename}`.

**You don’t need to change anything** unless you want to:
- Change the 50 MB limit: edit the migration (or run a new one) that sets `file_size_limit` on the `team-uploads` bucket.

**Environment variables** (already required for the app):
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (used by the sync-to-Drive API)

---

## 2. Document list (what users see)

The list of required documents, deadlines, allowed file types, and labels is defined in code:

**File:** `src/lib/data/dashboard-documents.ts`

Each document has:

| Field         | Meaning |
|----------------|--------|
| `key`          | Unique id (e.g. `bpefs`, `tvsd`). Used in storage path and DB. |
| `label`        | Display name on the dashboard. |
| `classes`      | Which vehicle classes see it: `['EV']`, `['CV']`, or `['EV', 'CV']`. |
| `allowedTypes` | MIME types for file input, e.g. `['application/pdf']`, `['application/zip']`. Use `[]` for link-only (e.g. VSV). |
| `deadline`     | Shown in the table (no automatic enforcement). |
| `submission`   | Legacy; not shown in the table anymore. |
| `format`       | Shown in table (e.g. `.pdf`, `YouTube link`). |
| `fileSize`     | Shown in table. Use `'50MB'` for docs that have a 50 MB limit in code. |

**To add a new document:** append an object to `DASHBOARD_DOCUMENTS` with a unique `key` and the fields above. The upload UI and table will pick it up automatically.

**To change deadlines or labels:** edit the same file and redeploy.

**File size validation:** In `src/app/dashboard/page.tsx`, any document with `fileSize === '50MB'` is validated to 50 MB on upload. To support a different limit, add logic there (and optionally in the bucket migration).

---

## 3. Google Drive sync (optional)

If you want a copy of each uploaded file in Google Drive:

1. **Create a Google Cloud service account** (e.g. for a project used by the Hub).
2. **Get credentials** (JSON key or `client_email` + `private_key`).
3. **Share a Drive folder** (optional but recommended) with the service account email as **Editor**.
4. **Set environment variables**:

| Variable | Required | Description |
|----------|----------|-------------|
| `GOOGLE_APPLICATION_CREDENTIALS_JSON` | Yes (or use email+key below) | Full JSON key as a single string. |
| or `GOOGLE_SERVICE_ACCOUNT_EMAIL` + `GOOGLE_PRIVATE_KEY` | Alternative to JSON | Service account email and private key. |
| `GOOGLE_DRIVE_ROOT_FOLDER_ID` | No | If set, files go under this folder (must be shared with the service account). If not set, a folder **"Formula IHU Uploads"** is created in the service account’s Drive. |

5. **Where files go:** See [GOOGLE_DRIVE_UPLOADS.md](./GOOGLE_DRIVE_UPLOADS.md).

Sync runs **after** a successful upload: the dashboard calls `POST /api/sync-upload-to-drive`. If Google credentials are missing or invalid, the upload still succeeds; only the Drive copy is skipped.

---

## 4. Optional app env vars (display only)

These are **optional** and not used for upload validation in the current dashboard (validation uses `dashboard-documents.ts` and the 50 MB rule in code):

- `NEXT_PUBLIC_MAX_FILE_SIZE` — e.g. `52428800` (50 MB). Documented in Vercel setup; can be used later for a global limit.
- `NEXT_PUBLIC_ALLOWED_FILE_TYPES` — e.g. `pdf,doc,docx,xls,xlsx,ppt,pptx,zip,txt`. Same: for reference or future use.

---

## 5. Who can upload

- **Supabase RLS** and **app roles** decide who can upload:
  - User must be authenticated and have a **team** (`user_profiles.team_id`).
  - In the app, only users with role `team_leader`, `team_member`, or `admin` see the upload section (see `canUpload` in `src/app/dashboard/page.tsx`).

To change who sees the upload UI, adjust the `canUpload` condition in the dashboard page.

---

## Quick reference

| What you want to do | Where to look |
|---------------------|----------------|
| Add/remove/edit required documents | `src/lib/data/dashboard-documents.ts` |
| Change file size limit for a document | `dashboard-documents.ts` (`fileSize`) + `src/app/dashboard/page.tsx` (50 MB check) |
| Change Supabase bucket limit | Migration that creates/updates `team-uploads` bucket |
| Enable/configure Google Drive sync | Env: `GOOGLE_APPLICATION_CREDENTIALS_JSON` (or email+key), optional `GOOGLE_DRIVE_ROOT_FOLDER_ID` |
| See where files go in Drive | [GOOGLE_DRIVE_UPLOADS.md](./GOOGLE_DRIVE_UPLOADS.md) |
| Change who can upload | `src/app/dashboard/page.tsx` (`canUpload`) and Supabase RLS on `team_uploads` / storage |
