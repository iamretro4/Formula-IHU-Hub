# Email & Auth Setup

Single reference for Supabase auth, redirect URLs, and Resend (app emails + auth emails via SMTP).

## 1. Environment variables

| Variable | Where | Purpose |
|----------|--------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Vercel / `.env.local` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Vercel / `.env.local` | Supabase anon key |
| `NEXT_PUBLIC_APP_URL` | Vercel / `.env.local` | App URL for redirects and links in emails (e.g. `https://hub.fihu.gr`) |
| `RESEND_API_KEY` | Vercel / `.env.local` | Resend API key (app emails + Supabase SMTP password) |
| `RESEND_FROM_EMAIL` | Vercel (optional) | From address for app emails (e.g. `Formula IHU Hub <noreply@fihu.gr>`) |

Copy from `.env.example` and fill in values. For a new Supabase project, create a project at [Supabase Dashboard](https://supabase.com/dashboard) and get URL and anon key from **Project Settings → API**.

## 2. Supabase Dashboard: URL configuration

In [Supabase Dashboard](https://supabase.com/dashboard) → your project → **Authentication** → **URL Configuration**:

- **Site URL**: Your app URL (e.g. `https://hub.fihu.gr` or `http://localhost:3000` for local).
- **Redirect URLs**: Add:
  - `http://localhost:3000/**` (local)
  - `https://your-production-domain.com/**` (production)
  - `https://your-production-domain.com/auth/callback`
  - `https://your-production-domain.com/auth/reset-password`

Without these, sign-in redirects and password reset links will fail.

## 3. Auth emails (confirm signup, password reset)

Supabase sends these; configure **Custom SMTP** so they go through Resend:

1. **Supabase Dashboard** → **Authentication** → **SMTP Settings**.
2. Enable **Custom SMTP** and set:
   - **Host:** `smtp.resend.com`
   - **Port:** `587`
   - **Username:** `resend`
   - **Password:** Your Resend API key (same as `RESEND_API_KEY`)
   - **Sender email:** e.g. `noreply@fihu.gr` (must be verified in Resend if custom domain)
   - **Sender name:** `Formula IHU Hub`
3. **Authentication** → **Providers** → **Email** → enable **Confirm email** if you want signup confirmation.
4. (Optional) **Authentication** → **Email Templates** → set subjects and paste HTML from `supabase/templates/confirmation.html` and `supabase/templates/recovery.html` for branding.

## 4. App emails (account approved, test email)

The app sends these via the Resend API (see `src/lib/email.ts`). They require:

- **Vercel** (or your host): Set `RESEND_API_KEY` (required). Set `RESEND_FROM_EMAIL` (e.g. `Formula IHU Hub <noreply@fihu.gr>`) and `NEXT_PUBLIC_APP_URL`. Redeploy after changing env.
- **Resend**: [Verify the domain](https://resend.com/domains) you use in `RESEND_FROM_EMAIL` and add the DNS records Resend provides (SPF, DKIM). **Approval emails will not work for arbitrary recipients** until the domain is verified and `RESEND_FROM_EMAIL` is set.

Without a verified domain and `RESEND_FROM_EMAIL`, Resend only allows sending to the email on your Resend account (testing mode). If approval email fails, the admin can use **Resend approval email** (Admin → Users → ⋮ on an approved user) after fixing config.

## 5. Quick tests

1. **Auth callback**: Sign up or sign in → you should be redirected to `/complete-profile` or `/dashboard`.
2. **Password reset**: **Forgot password** → enter email → check inbox for reset link (requires SMTP configured).
3. **App email**: As admin, open **Admin** → **Test email** → send; check inbox and [Resend dashboard](https://resend.com/emails).
4. **Approval email**: As admin, approve a user → they should receive “Account approved” (requires `RESEND_API_KEY` and, for any recipient, verified domain + `RESEND_FROM_EMAIL`).

## 6. Local development

- **Supabase Cloud**: Use the same Dashboard SMTP and redirect URLs; add `http://localhost:3000/**` and `http://localhost:3000/auth/callback` to Redirect URLs.
- **Local Supabase** (`supabase start`): SMTP and redirect URLs are in `supabase/config.toml`; the CLI reads `RESEND_API_KEY` from a root `.env` (not `.env.local`).
