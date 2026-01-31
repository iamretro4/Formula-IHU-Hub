'use client'

import { useCallback, useEffect, useState } from 'react'
import getSupabaseClient from '@/lib/supabase/client'

export type UploadedFile = {
  id: string
  team_id: string
  uploaded_by: string
  document_key: string
  file_name: string
  storage_path: string
  uploaded_at: string
}

type SupabaseClient = ReturnType<typeof getSupabaseClient>

export function useTeamUploads(teamId: string | null, supabaseOrNull?: SupabaseClient | null) {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([])
  const [teamClass, setTeamClass] = useState('EV')
  const supabase = supabaseOrNull ?? (typeof window !== 'undefined' ? getSupabaseClient() : null)

  const refetch = useCallback(async () => {
    if (!teamId || !supabase) {
      setUploadedFiles([])
      return
    }
    try {
      const { data } = await supabase
        .from('team_uploads' as any)
        .select('*, uploaded_by (first_name, last_name)')
        .eq('team_id', teamId)
        .order('uploaded_at', { ascending: false })
      setUploadedFiles((data ?? []) as unknown as UploadedFile[])
    } catch (error) {
      console.error('Error fetching uploaded files:', error)
      setUploadedFiles([])
    }
  }, [teamId, supabase])

  useEffect(() => {
    if (!teamId || !supabase) {
      if (!teamId) setUploadedFiles([])
      return
    }
    let cancelled = false
    ;(async () => {
      try {
        const { data: teamData } = await supabase
          .from('teams')
          .select('vehicle_class')
          .eq('id', teamId)
          .single() as { data: { vehicle_class?: string } | null }
        if (!cancelled && teamData?.vehicle_class) setTeamClass(teamData.vehicle_class)
        const { data } = await supabase
          .from('team_uploads' as any)
          .select('*, uploaded_by (first_name, last_name)')
          .eq('team_id', teamId)
          .order('uploaded_at', { ascending: false })
        if (!cancelled) setUploadedFiles((data ?? []) as unknown as UploadedFile[])
      } catch (error) {
        console.error('Error fetching team/uploads:', error)
      }
    })()
    return () => { cancelled = true }
  }, [teamId, supabase])

  return { uploadedFiles, teamClass, refetch, supabase }
}
