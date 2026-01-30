// =====================================================
// Formula IHU Hub - Auth Callback & Middleware
// File: src/app/api/auth/callback/route.ts
// =====================================================

import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')

  if (code) {
    const supabase = await createServerSupabase()
    
    await supabase.auth.exchangeCodeForSession(code)
    
    // Get the user after exchange
    const { data: { user } } = await supabase.auth.getUser()
    
    if (user) {
      // Upsert user profile from auth metadata
      const metadata = user.user_metadata as any
      
      // Upsert profile from metadata; do not include login_approved or app_role so we do not overwrite admin-set values
      await supabase
        .from('user_profiles')
        .upsert({
          id: user.id,
          email: user.email!,
          first_name: metadata.first_name || '',
          last_name: metadata.last_name || '',
          father_name: metadata.father_name || '',
          phone: metadata.phone || '',
          emergency_contact: metadata.emergency_contact || '',
          campsite_staying: metadata.campsite_staying || false,
          ehic_number: metadata.ehic_number || null,
          team_id: metadata.team_id || null,
          profile_completed: false,
          university_name: metadata.university_name || null,
          faculty_advisor_name: metadata.faculty_advisor_name || null,
          faculty_advisor_position: metadata.faculty_advisor_position || null,
          billing_address: metadata.billing_address || null,
          vat_id: metadata.vat_id || null,
        } as any, { 
          onConflict: 'id',
          ignoreDuplicates: false
        })
    }
  }

  // Redirect to complete profile or dashboard
  return NextResponse.redirect(new URL('/complete-profile', request.url))
}
