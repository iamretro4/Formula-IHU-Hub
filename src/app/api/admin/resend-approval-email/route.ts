// Resend the "account approved" email to an already-approved user.
// Useful when the first send failed (e.g. Resend config) or the user didn't receive it.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerSupabase } from '@/lib/supabase/server'
import { sendApprovalEmail } from '@/lib/email'

type ProfileRow = {
  app_role: string
  login_approved: boolean | null
  email?: string | null
  first_name?: string | null
  team_lead?: boolean | null
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabase()
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

    const body = await request.json()
    const userId = typeof body.userId === 'string' ? body.userId : null
    if (!userId) {
      return NextResponse.json({ message: 'userId is required' }, { status: 400 })
    }

    const { data: targetProfile, error: fetchError } = await supabase
      .from('user_profiles')
      .select('app_role, login_approved, email, first_name, team_lead')
      .eq('id', userId)
      .single() as { data: ProfileRow | null; error: unknown }

    if (fetchError || !targetProfile) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 })
    }

    if (targetProfile.login_approved !== true) {
      return NextResponse.json(
        { message: 'User is not approved. Approve the user first, then resend the email.' },
        { status: 400 }
      )
    }

    let toEmail = (targetProfile.email ?? '').trim()
    if (!toEmail) {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
      if (supabaseUrl && serviceRoleKey) {
        const admin = createClient(supabaseUrl, serviceRoleKey)
        const { data: authData } = await admin.auth.admin.getUserById(userId)
        toEmail = (authData?.user?.email ?? '').trim()
      }
    }

    if (!toEmail) {
      return NextResponse.json(
        { message: 'No email address for user (profile or auth)' },
        { status: 400 }
      )
    }

    const isTeamLeader = targetProfile.app_role === 'team_leader'
    const result = await sendApprovalEmail({
      to: toEmail,
      firstName: targetProfile.first_name ?? '',
      isTeamLeader: !!targetProfile.team_lead || isTeamLeader,
    })

    if (result.ok) {
      return NextResponse.json({ ok: true, email_sent: true })
    }
    return NextResponse.json({
      ok: false,
      email_sent: false,
      email_error: result.error,
    }, { status: 200 })
  } catch (error) {
    console.error('[resend-approval-email] Error:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}
