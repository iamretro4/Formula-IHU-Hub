# Supabase Auth email templates

- **confirmation.html** — Used for the “Confirm your email” signup email. Branded layout with Formula IHU logo. Uses `{{ .ConfirmationURL }}`.
- **recovery.html** — Used for the “Reset password” auth email. Branded layout with Formula IHU logo. Uses `{{ .ConfirmationURL }}`.

**Logo:** The templates use `https://hub.fihu.gr/formula-ihu-logo.png` for the Formula IHU logo in the email.

**Local Supabase (optional, requires Docker):** Templates are loaded from here via `config.toml`. Restart with `supabase stop && supabase start` after changes.

**Supabase Cloud (no Docker needed):** Copy each HTML file into [Dashboard → Authentication → Email Templates](https://supabase.com/dashboard) into the matching template (Confirm signup, Reset password). Keep `{{ .ConfirmationURL }}` unchanged.
