// Admin-only: send a test email to verify Resend is configured.

import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { Database } from '@/lib/types/database'
import { sendTestEmail } from '@/lib/email'

function isValidEmail(s: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s?.trim() ?? '')
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient<Database>({ cookies })
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const { data: adminProfile } = await supabase
      .from('user_profiles')
      .select('app_role')
      .eq('id', user.id)
      .single() as { data: { app_role: string } | null }

    if (adminProfile?.app_role !== 'admin') {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json().catch(() => ({}))
    const toInput = typeof body.to === 'string' ? body.to.trim() : ''
    const to = toInput && isValidEmail(toInput) ? toInput : (user.email ?? '')

    if (!to || !isValidEmail(to)) {
      return NextResponse.json(
        { message: 'Provide a valid "to" email or ensure your account has an email' },
        { status: 400 }
      )
    }

    const result = await sendTestEmail(to)
    if (!result.ok) {
      return NextResponse.json({ message: result.error }, { status: 500 })
    }

    return NextResponse.json({ message: 'Test email sent', to })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    return NextResponse.json({ message }, { status: 500 })
  }
}
