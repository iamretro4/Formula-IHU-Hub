# Vercel & Supabase setup

Use this after deploying to Vercel and with your Supabase project.

---

## 1. Vercel: environment variables

In **Vercel** → your project → **Settings** → **Environment Variables**, add these. Use **Production** (and **Preview** if you use preview deployments). Use the **same values as in your `.env.local`** for keys; for production URLs use `https://hub.fihu.gr` where below.

| Name | Value | Notes |
|------|--------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://zrwgynlqhsodmxznbmmp.supabase.co` | Same as .env.local (your new project) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | *(paste anon key from .env.local)* | Same as .env.local |
| `SUPABASE_SERVICE_ROLE_KEY` | *(paste service role key from .env.local)* | Same as .env.local; keep secret |
| `NEXT_PUBLIC_APP_URL` | `https://hub.fihu.gr` | **Production URL** – links in emails and auth redirects |
| `RESEND_API_KEY` | *(paste from .env.local)* | Same as .env.local |
| `RESEND_FROM_EMAIL` | `Formula IHU Hub <noreply@fihu.gr>` | Optional; use after verifying domain in Resend |
| `NEXT_PUBLIC_BASE_URL` | `https://hub.fihu.gr` | Optional |
| `NEXT_PUBLIC_HUB_URL` | `https://hub.fihu.gr` | Optional |
| `NEXT_PUBLIC_EVENT_TIMEZONE` | `Europe/Athens` | Optional |
| `NEXT_PUBLIC_COMPETITION_NAME` | `Formula IHU 2026` | Optional |
| `NEXT_PUBLIC_MAX_FILE_SIZE` | `52428800` | Optional |
| `NEXT_PUBLIC_ALLOWED_FILE_TYPES` | `pdf,doc,docx,xls,xlsx,ppt,pptx,zip,txt` | Optional |
| `GOOGLE_APPLICATION_CREDENTIALS_JSON` | *(paste full JSON from .env.local)* | Only if you use Google Drive sync |

After adding or changing variables, **redeploy** (Deployments → … → Redeploy).

---

## 2. Vercel: what else to do

1. **Domain**  
   - **Settings** → **Domains** → add `hub.fihu.gr`.  
   - Point your DNS (at your registrar) to Vercel as instructed (CNAME or A record).

2. **Build & dev**  
   - Build command: `npm run build` (default).  
   - Output: Next.js (default).  
   - No need to set root directory unless the app is in a subfolder.

3. **Env scope**  
   - Add the variables above for **Production**.  
   - If you use Preview deployments, add the same keys for **Preview** (you can set `NEXT_PUBLIC_APP_URL` to the preview URL or keep `https://hub.fihu.gr` for emails).

4. **Redeploy**  
   - After changing env vars or connecting a new domain, trigger a new deployment so the app uses the new values.

---

## 3. Supabase: what to do

1. **URL configuration**  
   - **Authentication** → **URL Configuration**:
   - **Site URL**: `https://hub.fihu.gr`
   - **Redirect URLs** – add:
     - `https://hub.fihu.gr/**`
     - `https://hub.fihu.gr/auth/callback`
     - `https://hub.fihu.gr/auth/reset-password`
     - `http://localhost:3000/**` (for local dev)
     - `http://localhost:3000/auth/callback`
     - `http://localhost:3000/auth/reset-password`

2. **SMTP (auth emails)**  
   - **Authentication** → **SMTP Settings** → enable **Custom SMTP**:
   - Host: `smtp.resend.com`  
   - Port: `587`  
   - Username: `resend`  
   - Password: *(your Resend API key – same as `RESEND_API_KEY`)*  
   - Sender email: `noreply@fihu.gr` (or your verified domain in Resend)  
   - Sender name: `Formula IHU Hub`  

3. **Email provider**  
   - **Authentication** → **Providers** → **Email** → enable **Confirm email** if you want signup confirmation.

4. **Optional: email templates**  
   - **Authentication** → **Email Templates** – paste HTML from `supabase/templates/confirmation.html` and `supabase/templates/recovery.html` for branded emails.

---

## 4. Resend (if using custom domain)

- In [Resend](https://resend.com/domains), add and verify `fihu.gr` (or the domain you use for `noreply@fihu.gr`).  
- Add the DNS records Resend gives you (SPF, DKIM).  
- Then set `RESEND_FROM_EMAIL=Formula IHU Hub <noreply@fihu.gr>` in Vercel and redeploy.

---

## Quick checklist

- [ ] Vercel: all env vars set (especially `NEXT_PUBLIC_APP_URL=https://hub.fihu.gr`)
- [ ] Vercel: domain `hub.fihu.gr` added and DNS pointed to Vercel
- [ ] Vercel: redeploy after env/domain changes
- [ ] Supabase: Site URL and Redirect URLs set for `https://hub.fihu.gr` and localhost
- [ ] Supabase: SMTP configured (Resend) for auth emails
- [ ] Resend: domain verified if using `noreply@fihu.gr`
