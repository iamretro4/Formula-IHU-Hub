// Admin-only: update a user's email in auth.users and user_profiles.
// Required so login and approval emails use the same address.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerSupabase } from '@/lib/supabase/server'

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

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
    const userId = typeof body.userId === 'string' ? body.userId.trim() : null
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''

    if (!userId) {
      return NextResponse.json({ message: 'userId is required' }, { status: 400 })
    }
    if (!email) {
      return NextResponse.json({ message: 'Valid email is required' }, { status: 400 })
    }
    if (!emailRegex.test(email)) {
      return NextResponse.json({ message: 'Invalid email format' }, { status: 400 })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        { message: 'Server missing Supabase admin configuration' },
        { status: 500 }
      )
    }

    const admin = createClient(supabaseUrl, serviceRoleKey)

    const { error: authUpdateError } = await admin.auth.admin.updateUserById(userId, { email })
    if (authUpdateError) {
      console.error('[update-user-email] Auth update failed', authUpdateError)
      return NextResponse.json(
        { message: authUpdateError.message || 'Failed to update auth email' },
        { status: 500 }
      )
    }

    const { error: profileUpdateError } = await admin
      .from('user_profiles')
      .update({ email })
      .eq('id', userId)

    if (profileUpdateError) {
      console.error('[update-user-email] Profile update failed', profileUpdateError)
      return NextResponse.json(
        { message: 'Auth email updated but profile sync failed' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, email })
  } catch (error) {
    console.error('Update user email error', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}
