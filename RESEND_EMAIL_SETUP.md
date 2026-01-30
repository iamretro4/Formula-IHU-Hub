# Resend Email Configuration for Supabase

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

1. Restart Supabase: `supabase stop && supabase start`
2. Test password reset:
   - Go to `/auth/forgot-password`
   - Enter an email address
   - Check if email is received
3. Check Resend dashboard for delivery status

### 6. Local Development vs Production

**For Local Development:**
- You can keep using Inbucket (email testing server) by disabling SMTP
- Or use Resend SMTP for real email testing

**For Production:**
- Must use Resend SMTP (already configured)
- Domain must be verified in Resend

## 📧 Email Templates (Optional)

You can customize email templates by creating:
- `supabase/templates/reset_password.html`
- `supabase/templates/confirmation.html`
- `supabase/templates/invite.html`

Then uncomment and configure in `config.toml`:

```toml
[auth.email.template.reset_password]
subject = "Reset Your Password - Formula IHU Hub"
content_path = "./supabase/templates/reset_password.html"
```

## 🔍 Troubleshooting

### Emails not sending?
1. Check domain is verified in Resend dashboard
2. Verify DNS records are correctly added
3. Check Resend dashboard for error messages
4. Try port 587 if 465 doesn't work (change in config.toml)

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

