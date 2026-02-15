// Admins and team leaders can approve or reject user login requests.
// Team leaders can only approve/reject members of their own team.
// Optionally approve a user as team leader (admin only, if they registered as team captain).
// Sends an email to the user when their account is approved (requires RESEND_API_KEY on Vercel).

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerSupabase } from '@/lib/supabase/server'
import { Database } from '@/lib/types/database'
import { sendApprovalEmail } from '@/lib/email'

type ProfileRow = {
  app_role: string
  team_lead: boolean | null
  login_approved: boolean
  team_id: string | null
  email?: string
  first_name?: string | null
}

/** Fields we update when approving a user (matches DB; type is local so build works even if generated types are stale). */
type ApproveUserUpdates = {
  login_approved: boolean
  app_role?: 'team_leader'
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabase()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const { data: callerProfile } = await supabase
      .from('user_profiles')
      .select('app_role, team_id')
      .eq('id', user.id)
      .single() as { data: { app_role: string; team_id: string | null } | null }

    const isAdmin = callerProfile?.app_role === 'admin'
    const isTeamLeader = callerProfile?.app_role === 'team_leader'

    if (!isAdmin && !isTeamLeader) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const userId = typeof body.userId === 'string' ? body.userId : null
    const loginApproved = body.loginApproved === true
    const approveAsTeamLeader = body.approveAsTeamLeader === true

    if (!userId) {
      return NextResponse.json({ message: 'userId is required' }, { status: 400 })
    }

    const { data: targetProfile, error: fetchError } = await supabase
      .from('user_profiles')
      .select('app_role, team_lead, login_approved, team_id, email, first_name')
      .eq('id', userId)
      .single() as { data: ProfileRow | null; error: unknown }

    if (fetchError || !targetProfile) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 })
    }

    // Team leaders can only approve/reject members of their own team
    if (isTeamLeader) {
      if (!callerProfile?.team_id || targetProfile.team_id !== callerProfile.team_id) {
        return NextResponse.json({ message: 'You can only approve members of your own team' }, { status: 403 })
      }
      // Team leaders cannot promote to team_leader
      if (approveAsTeamLeader) {
        return NextResponse.json({ message: 'Only admins can approve as team leader' }, { status: 403 })
      }
    }

    const updates: ApproveUserUpdates = {
      login_approved: loginApproved,
    }
    if (loginApproved && approveAsTeamLeader && targetProfile.team_lead && isAdmin) {
      updates.app_role = 'team_leader'
    }

    const { error: updateError } = await supabase
      .from('user_profiles')
      .update(updates)
      .eq('id', userId)

    if (updateError) {
      console.error('Approve user error:', updateError)
      return NextResponse.json(
        { message: updateError.message || 'Failed to update user' },
        { status: 500 }
      )
    }

    // Notify user by email when approved (non-blocking; approval already succeeded)
    let emailSent = false
    let emailError: string | null = null
    if (loginApproved) {
      let toEmail = (targetProfile.email ?? '').trim()
      if (!toEmail) {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
        const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
        if (supabaseUrl && serviceRoleKey) {
          const admin = createClient(supabaseUrl, serviceRoleKey)
          const { data: authUser } = await admin.auth.admin.getUserById(userId)
          toEmail = (authUser?.user?.email ?? '').trim()
        }
      }
      if (toEmail) {
        const result = await sendApprovalEmail({
          to: toEmail,
          firstName: targetProfile.first_name ?? '',
          isTeamLeader: updates.app_role === 'team_leader',
        })
        emailSent = result.ok
        if (!result.ok) {
          emailError = result.error
          console.warn('[approve-user] Approval email failed:', result.error)
        }
      } else {
        emailError = 'No email address for user (profile or auth)'
      }
    }

    return NextResponse.json({
      success: true,
      login_approved: updates.login_approved,
      app_role: updates.app_role ?? targetProfile.app_role,
      email_sent: emailSent,
      email_error: emailError ?? undefined,
    })
  } catch (error) {
    console.error('Approve user error:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}
