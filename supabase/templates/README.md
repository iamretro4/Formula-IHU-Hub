# Supabase Auth email templates

- **recovery.html** — Used for the “Reset password” auth email. Branded layout with Formula IHU logo.

**Logo:** The template uses `https://hub.fihu.gr/formula-ihu-logo.png` for the Formula IHU logo in the email.

**Local Supabase (optional, requires Docker):** Templates are loaded from here via `config.toml`. Restart with `supabase stop && supabase start` after changes.

**Supabase Cloud (no Docker needed):** Copy the HTML into [Dashboard → Authentication → Email Templates](https://supabase.com/dashboard) and paste into the **Reset password** template. Keep `{{ .ConfirmationURL }}` unchanged.
