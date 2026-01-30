/**
 * Email utilities using Resend.
 * Requires RESEND_API_KEY in env (set in Vercel for production).
 * Optional: RESEND_FROM_EMAIL (e.g. "Formula IHU Hub <noreply@fihu.gr>") — only use after verifying the domain in Resend.
 */

import { Resend } from 'resend'

const resendApiKey = process.env.RESEND_API_KEY

/** Resend accepts "email@example.com" or "Name <email@example.com>". Normalize env value to avoid "Invalid from field". */
function normalizeFromEmail(raw: string | undefined): string {
  const defaultFrom = 'Formula IHU Hub <onboarding@resend.dev>'
  let s = (raw ?? '').trim().replace(/^["']|["']$/g, '')
  if (!s) return defaultFrom
  // Already "Name <email@domain>" or "email@domain"
  if (/^[^<]+<[^>]+@[^>]+>$/.test(s) || /^[^\s]+@[^\s]+$/.test(s)) return s
  // "Name email@domain" (missing brackets) -> "Name <email@domain>"
  const match = s.match(/^(.+?)\s+([^\s]+@[^\s]+)$/)
  if (match) return `${match[1].trim()} <${match[2]}>`
  // Bare email
  if (/^[^\s]+@[^\s]+$/.test(s)) return `Formula IHU Hub <${s}>`
  return defaultFrom
}

const fromEmail = normalizeFromEmail(process.env.RESEND_FROM_EMAIL)

function getResend() {
  if (!resendApiKey) return null
  return new Resend(resendApiKey)
}

export type SendApprovalEmailParams = {
  to: string
  firstName: string
  isTeamLeader?: boolean
}

/**
 * Sends an email notifying the user that their account has been approved.
 * Returns { ok: true } on success, { ok: false, error } on failure.
 */
export async function sendApprovalEmail(
  params: SendApprovalEmailParams
): Promise<{ ok: true } | { ok: false; error: string }> {
  const client = getResend()
  if (!client) {
    return { ok: false, error: 'RESEND_API_KEY is not configured' }
  }

  const { to, firstName, isTeamLeader } = params
  const displayName = firstName?.trim() || 'there'
  const roleNote = isTeamLeader
    ? ' You have been approved as a team leader and can manage your team members and file uploads.'
    : ''

  const subject = 'Your Formula IHU Hub account has been approved'
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Account approved</title>
</head>
<body style="font-family: system-ui, -apple-system, sans-serif; line-height: 1.6; color: #1f2937; max-width: 560px; margin: 0 auto; padding: 24px;">
  <h1 style="color: #111827; font-size: 1.5rem; margin-bottom: 16px;">Account approved</h1>
  <p>Hi ${escapeHtml(displayName)},</p>
  <p>An administrator has approved your Formula IHU Hub account. You can now sign in and use the platform.</p>
  ${roleNote ? `<p>${escapeHtml(roleNote.trim())}</p>` : ''}
  <p>
    <a href="${getSignInUrl()}" style="display: inline-block; background: #2563eb; color: white; padding: 10px 20px; text-decoration: none; border-radius: 8px; font-weight: 500;">Sign in to Formula IHU Hub</a>
  </p>
  <p style="margin-top: 24px; font-size: 0.875rem; color: #6b7280;">
    If you did not request an account, you can ignore this email.
  </p>
</body>
</html>
`.trim()

  try {
    const { data, error } = await client.emails.send({
      from: fromEmail,
      to: [to],
      subject,
      html,
    })
    if (error) {
      console.error('[email] Resend error:', error)
      return { ok: false, error: error.message || 'Failed to send email' }
    }
    return { ok: true }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to send email'
    console.error('[email] Send exception:', err)
    return { ok: false, error: message }
  }
}

/**
 * Sends a simple test email to verify Resend is configured.
 * Returns { ok: true } on success, { ok: false, error } on failure.
 */
export async function sendTestEmail(to: string): Promise<
  { ok: true } | { ok: false; error: string }
> {
  const client = getResend()
  if (!client) {
    return { ok: false, error: 'RESEND_API_KEY is not configured' }
  }

  const subject = 'Formula IHU Hub – test email'
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Test email</title>
</head>
<body style="font-family: system-ui, -apple-system, sans-serif; line-height: 1.6; color: #1f2937; max-width: 560px; margin: 0 auto; padding: 24px;">
  <h1 style="color: #111827; font-size: 1.5rem; margin-bottom: 16px;">Test email</h1>
  <p>This is a test email from Formula IHU Hub.</p>
  <p>If you received this, the app’s email integration (Resend) is working.</p>
  <p style="margin-top: 24px; font-size: 0.875rem; color: #6b7280;">
    Sent at ${escapeHtml(new Date().toISOString())}
  </p>
</body>
</html>
`.trim()

  try {
    const { error } = await client.emails.send({
      from: fromEmail,
      to: [to],
      subject,
      html,
    })
    if (error) {
      console.error('[email] Resend test error:', error)
      return { ok: false, error: error.message || 'Failed to send email' }
    }
    return { ok: true }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to send email'
    console.error('[email] Send test exception:', err)
    return { ok: false, error: message }
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function getSignInUrl(): string {
  const base =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_VERCEL_URL ||
    process.env.VERCEL_URL
  if (base && base.trim()) {
    const origin = base.trim().startsWith('http') ? base.trim() : `https://${base.trim()}`
    return `${origin}/auth/signin`
  }
  return '/auth/signin'
}
