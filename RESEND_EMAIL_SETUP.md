# Resend Email Configuration for Supabase

## 🚀 Quick fix: Emails not working?

There are **two separate email systems**. Both must be configured.

| What | Where to configure |
|------|--------------------|
| **Signup confirmation / password reset / auth emails** | **Supabase Dashboard** (see below) — Supabase sends these; the repo’s `config.toml` does **not** affect your cloud project. |
| **App emails** (e.g. “Account approved”) | **Vercel** — add `RESEND_API_KEY` (and optionally `NEXT_PUBLIC_APP_URL`) in Project → Settings → Environment Variables, then redeploy. |

### 1. Supabase Cloud (required for confirmation + password reset emails)

1. Go to [Supabase Dashboard](https://supabase.com/dashboard) → your project → **Authentication** → **SMTP Settings**.
2. Enable **Custom SMTP** and set:
   - **Host:** `smtp.resend.com`
   - **Port:** `587`
   - **Username:** `resend`
   - **Password:** your Resend API key (same as `RESEND_API_KEY` in `.env.local`)
   - **Sender email:** `noreply@fihu.gr` (or leave default; if using custom domain, [verify it in Resend](https://resend.com/domains) first)
   - **Sender name:** `Formula IHU Hub`
3. Save.
4. **Enable signup confirmation** (so users receive a “Confirm your email” message): **Authentication** → **Providers** → **Email** → turn on **“Confirm email”**. Save.
5. **(Optional)** To use the same branded confirmation email as in the repo: **Authentication** → **Email Templates** → **Confirm signup** → set **Subject** to `Confirm your email — Formula IHU Hub` and paste the contents of `supabase/templates/confirmation.html` into **Message (HTML)**. Keep `{{ .ConfirmationURL }}` unchanged.
6. Go to **Authentication** → **URL Configuration** → **Redirect URLs** and add:
   - `https://your-production-domain.com/auth/reset-password` (replace with your real app URL, e.g. `https://formula-ihu-hub.vercel.app/auth/reset-password`)

### 2. Vercel (required for “Account approved” / new user notification emails)

When an admin approves a new user, the app sends an “account approved” email via Resend. This only works if Resend is configured on Vercel:

1. Go to [Vercel](https://vercel.com) → your project → **Settings** → **Environment Variables**.
2. Add:
   - **`RESEND_API_KEY`** = your Resend API key (same value as in `.env.local`) — **required** for any approval emails.
   - (Recommended) **`NEXT_PUBLIC_APP_URL`** = your production URL (e.g. `https://hub.fihu.gr`) so links in emails point to the right place.
   - **`RESEND_FROM_EMAIL`** = `Formula IHU Hub <noreply@fihu.gr>` — **required to send to other recipients**. Without a verified-domain “from” address, Resend only allows sending to your own email (see [Troubleshooting](#you-can-only-send-testing-emails-to-your-own-email-address)).
3. **Redeploy** the project (Deployments → … → Redeploy).

If `RESEND_API_KEY` is missing on Vercel, the admin will see a warning after approving a user (“Approval email could not be sent…”). If you see “You can only send testing emails to your own email address”, add `RESEND_API_KEY`, verify your domain at [resend.com/domains](https://resend.com/domains), then set `RESEND_FROM_EMAIL` and redeploy.

---

## ✅ Already Configured (in this repo)

1. **SMTP Settings** in `supabase/config.toml` (used when running **local Supabase** only):
   - Host: `smtp.resend.com`
   - Port: `587` (TLS)
   - Username: `resend`
   - Password: `env(RESEND_API_KEY)` — read from `.env` in project root when you run `supabase start`
   - Sender Email: `noreply@fihu.gr`
   - Sender Name: `Formula IHU Hub`

2. **Email Rate Limit**: 10 emails per hour (safe for Resend free tier)

3. **Redirect URLs**: Reset password URLs for `127.0.0.1` and `localhost` are in `config.toml`

## ⚠️ Important: Cloud vs Local

- **Supabase Cloud** (your project at `*.supabase.co`): The `config.toml` in this repo does **not** control your cloud project. You **must** configure SMTP in the [Supabase Dashboard](https://supabase.com/dashboard) → your project → **Authentication** → **SMTP Settings**. Use the same values as above and set **Password** to your Resend API key (the one in `.env.local`).
- **Local Supabase** (`supabase start`): The CLI reads `RESEND_API_KEY` from a **`.env`** file in the project root (not `.env.local`). Either add `RESEND_API_KEY=...` to a root `.env`, or the CLI won’t have the key and SMTP will fail.

## 🔧 Additional Steps Required

### 1. Verify Domain in Resend Dashboard

**Before emails will work, you MUST verify your domain:**

1. Go to [Resend Dashboard](https://resend.com/domains)
2. Click "Add Domain"
3. Enter `fihu.gr`
4. Add the DNS records that Resend provides to your domain's DNS settings:
   - SPF record
   - DKIM records (usually 3 CNAME records)
   - DMARC record (optional but recommended)
5. Wait for verification (can take a few minutes to 24 hours)

### 2. Update Site URL for Production

When deploying to production, update `site_url` in `supabase/config.toml`:

```toml
site_url = "https://your-production-domain.com"
```

Also add production URLs to `additional_redirect_urls`:

```toml
additional_redirect_urls = [
  "https://your-production-domain.com",
  "https://your-production-domain.com/auth/reset-password"
]
```

### 3. Supabase Cloud: Set SMTP and Redirect URLs

If you use **Supabase Cloud** (hosted at `*.supabase.co`):

1. **SMTP**: In [Supabase Dashboard](https://supabase.com/dashboard) → your project → **Authentication** → **SMTP Settings**:
   - Enable **Custom SMTP**
   - Host: `smtp.resend.com`
   - Port: `587`
   - Username: `resend`
   - Password: your Resend API key (same value as in `.env.local`)
   - Sender email: `noreply@fihu.gr`
   - Sender name: `Formula IHU Hub`

2. **Redirect URLs**: In **Authentication** → **URL Configuration** → **Redirect URLs**, add:
   - `http://localhost:3000/auth/reset-password` (local dev)
   - Your production URL when deployed, e.g. `https://your-domain.com/auth/reset-password`

### 4. Local Supabase: Resend API key in `.env`

For **local Supabase** (`supabase start`), the CLI reads `RESEND_API_KEY` from a **`.env`** file in the project root (not `.env.local`). Either:

- Add to a root `.env`: `RESEND_API_KEY=<your-key>` (same value as in `.env.local`), or  
- Ensure your local Supabase is started with access to that env var (e.g. via your shell or a script that exports it).

The `config.toml` already has `pass = "env(RESEND_API_KEY)"`.

### 5. Test Email Sending

**App emails (Resend):**

1. As an admin, go to **Admin Panel** (`/admin`).
2. In the **Test email** card, enter an email (or leave empty to send to your account email) and click **Send test email**.
3. Check the inbox and the [Resend dashboard](https://resend.com/emails) for delivery status.

**Signup confirmation (Supabase Auth):**

1. Restart Supabase locally if needed: `supabase stop && supabase start`
2. Go to `/auth/signup`, create an account with a real email, and submit.
3. Check inbox for “Confirm your email — Formula IHU Hub” and click the link.

**Password reset (Supabase Auth):**

1. Restart Supabase locally if needed: `supabase stop && supabase start`
2. Go to `/auth/forgot-password`, enter an email, and submit.
3. Check inbox (and Supabase Dashboard → Auth → Users for rate limits / errors).

### 6. Local Development vs Production

**For Local Development:**
- You can keep using Inbucket (email testing server) by disabling SMTP
- Or use Resend SMTP for real email testing

**For Production:**
- Must use Resend SMTP (already configured)
- Domain must be verified in Resend

## 📧 Auth email templates (confirmation, password reset)

- **Confirmation (signup):** `supabase/templates/confirmation.html` is wired in `config.toml` under `[auth.email.template.confirmation]`. Users receive this after signup when **Confirm email** is enabled.
- **Recovery (password reset):** see below.

## 📧 Recovery (password reset) template

A branded reset-password template with the Formula IHU logo and layout is in the repo.

### Local Supabase

- **Recovery (reset password):** `supabase/templates/recovery.html` is wired in `config.toml` under `[auth.email.template.recovery]`.
- Restart Supabase after changing templates: `supabase stop && supabase start`.

### Supabase Cloud (required for production)

The repo’s `config.toml` does **not** apply to your hosted project. To use the same template in production:

1. Go to [Supabase Dashboard](https://supabase.com/dashboard) → your project → **Authentication** → **Email Templates**.
2. Open the **Reset password** (recovery) template.
3. Set **Subject** to: `Reset your password — Formula IHU Hub`.
4. Copy the full contents of `supabase/templates/recovery.html` from this repo and paste into the **Message (HTML)** editor. Do not change the Go template variable `{{ .ConfirmationURL }}` — Supabase replaces it with the reset link.
5. Save.

This keeps the same branded layout and logo and can help with deliverability (clear sender and content).

## 🔍 Troubleshooting

### "You can only send testing emails to your own email address"
This means Resend is in **testing mode**: with the default sender (`onboarding@resend.dev`) you can only send to the email on your Resend account (e.g. antonis.ntwnas@gmail.com). To send approval emails to **any** user:

1. **Set `RESEND_API_KEY` in Vercel**  
   Vercel → your project → **Settings** → **Environment Variables** → add `RESEND_API_KEY` (same value as in `.env.local`) → **Redeploy**.

2. **Verify a domain and set the "from" address**  
   - Go to [resend.com/domains](https://resend.com/domains), add and verify your domain (e.g. `fihu.gr`) using the DNS records Resend provides.  
   - In **Vercel** (Environment Variables), add:  
     **`RESEND_FROM_EMAIL`** = `Formula IHU Hub <noreply@fihu.gr>`  
     (use an address on your verified domain).  
   - Redeploy. After this, approval emails can be sent to any recipient.

Until the domain is verified, approval emails will only work when the approved user’s email is the same as your Resend account email.

### "Invalid \`from\` field" / format error
Resend requires the sender to be exactly one of:
- `email@example.com`
- `Name <email@example.com>`

In Vercel, set **`RESEND_FROM_EMAIL`** to one of those (e.g. `Formula IHU Hub <noreply@fihu.gr>`). Do not omit the angle brackets around the address when using a name. The app will try to fix common mistakes (e.g. `Formula IHU Hub noreply@fihu.gr` → `Formula IHU Hub <noreply@fihu.gr>`).

### Emails not sending?
1. **Password reset / auth emails:** Configure Custom SMTP in **Supabase Dashboard** (Authentication → SMTP) — the repo’s `config.toml` does not apply to Supabase Cloud.
2. **Approval emails:** Add `RESEND_API_KEY` in **Vercel** (Settings → Environment Variables) and redeploy.
3. Check domain is verified in [Resend Dashboard](https://resend.com/domains) if using a custom sender (e.g. `noreply@fihu.gr`); otherwise Resend only allows sending to your own email (see above).
4. Verify DNS records (SPF, DKIM) if using a custom domain.
5. Check Resend dashboard for delivery/error messages.
6. Try port 587 if 465 doesn't work (change in config.toml for local, or in Supabase SMTP for cloud).

### Emails going to spam?
1. Ensure SPF, DKIM, and DMARC records are set correctly
2. Check Resend dashboard for domain reputation
3. Consider setting up DMARC policy

### Reset password link not working?
1. Verify `site_url` matches your actual domain
2. Check `additional_redirect_urls` includes the reset password URL
3. Ensure the link hasn't expired (default: 1 hour)

## 📝 Notes

- Resend free tier: 100 emails/day, 3,000 emails/month
- API key is rate-limited, so the 10 emails/hour limit is safe
- For higher volume, consider Resend paid plans
- Always test email functionality before going to production

