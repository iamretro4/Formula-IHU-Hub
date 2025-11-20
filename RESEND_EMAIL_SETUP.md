# Resend Email Configuration for Supabase

## ✅ Already Configured

1. **SMTP Settings** in `supabase/config.toml`:
   - Host: `smtp.resend.com`
   - Port: `465` (SSL)
   - Username: `resend`
   - Password: Your Resend API key
   - Sender Email: `noreply@fihu.gr`
   - Sender Name: `Formula IHU Hub`

2. **Email Rate Limit**: Set to 10 emails per hour (safe for Resend free tier)

3. **Redirect URLs**: Added reset password URLs to allowed redirects

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

### 3. Security Best Practice (Optional but Recommended)

Instead of hardcoding the API key, use an environment variable:

1. Create a `.env` file in your project root (if not exists)
2. Add: `RESEND_API_KEY=re_EZpM4s8n_AJph7pU4R4QSyr47wP6mYHv7`
3. Update `supabase/config.toml`:
   ```toml
   pass = "env(RESEND_API_KEY)"
   ```

### 4. Test Email Sending

1. Restart Supabase: `supabase stop && supabase start`
2. Test password reset:
   - Go to `/auth/forgot-password`
   - Enter an email address
   - Check if email is received
3. Check Resend dashboard for delivery status

### 5. Local Development vs Production

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

