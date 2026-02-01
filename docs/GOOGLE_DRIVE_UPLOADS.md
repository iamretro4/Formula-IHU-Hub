# Where uploaded files are saved in Google Drive

When a user uploads a required document from the dashboard, the file is stored in **Supabase Storage** and a copy is synced to **Google Drive** (if the sync API is configured).

## Google Drive structure

1. **Root folder**
   - If `GOOGLE_DRIVE_ROOT_FOLDER_ID` is set in the environment, that folder is used as the root.
   - Otherwise, a folder named **"Formula IHU Uploads"** is created (or found) in the **service account’s Google Drive**.

2. **Team folder**
   - Inside the root folder, there is one folder per team: **`{Team Name} ({team_id})`**
   - Example: `University Racing (a1b2c3d4-...)`

3. **Files**
   - Each uploaded file (BPEFS, TVSD, ESOQ, CRD, etc.) is placed **directly inside** that team folder.
   - File names are the original names (e.g. `Anmeldung Form Filled Instructions.pdf`).

## Example layout

```
Formula IHU Uploads/                    ← root (or your GOOGLE_DRIVE_ROOT_FOLDER_ID)
├── University A Racing (uuid-1)/
│   ├── Business Plan.pdf
│   ├── Technical Doc.pdf
│   └── Cost Report.zip
└── University B Racing (uuid-2)/
    ├── BPEFS.pdf
    └── TVSD.pdf
```

## How to see the files

- **Using the root folder**: Share a Google Drive folder with the service account email (as Editor), set its ID as `GOOGLE_DRIVE_ROOT_FOLDER_ID`. All "Formula IHU Uploads" content will live under that folder in your Drive.
- **Using the default**: If you don’t set `GOOGLE_DRIVE_ROOT_FOLDER_ID`, the root and team folders are created in the **service account’s** Drive. To see them, share the root folder from the Google Cloud project (or the "Formula IHU Uploads" folder) with your own Google account.

## Sync trigger

Sync runs when an upload succeeds: the dashboard calls `POST /api/sync-upload-to-drive` with `team_id`, `storage_path`, `file_name`, and `document_key`. The API downloads the file from Supabase Storage and uploads it to the team’s folder in Drive (see `src/lib/google-drive.ts`).
