// Sync current user's profile from auth metadata and set profile_completed.
// Used when a user confirmed email but never hit /api/auth/callback (e.g. redirected to Site URL).

import { NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase/server'

export async function POST() {
  try {
    const supabase = await createServerSupabase()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const metadata = user.user_metadata as Record<string, unknown>
    const profilePayload: Record<string, unknown> = {
      id: user.id,
      email: user.email ?? '',
      first_name: metadata?.first_name ?? '',
      last_name: metadata?.last_name ?? '',
      father_name: metadata?.father_name ?? '',
      phone: metadata?.phone ?? '',
      emergency_contact: metadata?.emergency_contact ?? '',
      campsite_staying: metadata?.campsite_staying ?? false,
      ehic_number: metadata?.ehic_number ?? null,
      profile_completed: true,
      university_name: metadata?.university_name ?? null,
      faculty_advisor_name: metadata?.faculty_advisor_name ?? null,
      faculty_advisor_position: metadata?.faculty_advisor_position ?? null,
      billing_address: metadata?.billing_address ?? null,
      vat_id: metadata?.vat_id ?? null,
    }
    if (metadata?.team_id != null && metadata?.team_id !== '') {
      profilePayload.team_id = metadata.team_id
    }

    const { error: upsertError } = await supabase
      .from('user_profiles')
      .upsert(profilePayload as never, {
        onConflict: 'id',
        ignoreDuplicates: false,
      })

    if (upsertError) {
      console.error('[sync-profile] Upsert error:', upsertError)
      return NextResponse.json({ message: 'Failed to sync profile' }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[sync-profile] Error:', err)
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
  }
}
