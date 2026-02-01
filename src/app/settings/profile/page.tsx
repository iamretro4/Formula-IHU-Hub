'use client'

import { useState, useEffect, useMemo } from 'react'
import getSupabaseClient from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Save, AlertCircle, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { Database } from '@/lib/types/database'
import { useAuth } from '@/hooks/useAuth'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { logger } from '@/lib/utils/logger'
import { formatUserRole } from '@/lib/utils/formatting'

type UserProfile = Database['public']['Tables']['user_profiles']['Row']
type Team = Database['public']['Tables']['teams']['Row']

export default function ProfilePage() {
  const supabase = getSupabaseClient()
  const router = useRouter()
  const { user, profile: authProfile, loading: authLoading, refetch } = useAuth()
  const [saving, setSaving] = useState(false)
  const [teams, setTeams] = useState<Team[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loadingTeams, setLoadingTeams] = useState(true)

  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    father_name: '',
    phone: '',
    emergency_contact: '',
    ehic_number: '',
    campsite_staying: false,
    team_id: '',
    university_name: '',
    faculty_advisor_name: '',
    faculty_advisor_position: '',
    billing_address: '',
    vat_id: '',
  })

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/signin')
      return
    }

    if (authProfile) {
      setFormData({
        first_name: authProfile.first_name || '',
        last_name: authProfile.last_name || '',
        father_name: authProfile.father_name || '',
        phone: authProfile.phone || '',
        emergency_contact: authProfile.emergency_contact || '',
        ehic_number: authProfile.ehic_number || '',
        campsite_staying: authProfile.campsite_staying || false,
        team_id: authProfile.team_id ? String(authProfile.team_id) : '',
        university_name: authProfile.university_name || '',
        faculty_advisor_name: authProfile.faculty_advisor_name || '',
        faculty_advisor_position: authProfile.faculty_advisor_position || '',
        billing_address: authProfile.billing_address || '',
        vat_id: authProfile.vat_id || '',
      })
    }

    const loadTeams = async () => {
      setLoadingTeams(true)
      try {
        const { data: teamsData, error: teamsError } = await supabase
          .from('teams')
          .select('id, name, code, vehicle_class')
          .order('name')

        if (teamsError) {
          logger.error('Failed to load teams', teamsError, { context: 'profile_page' })
          toast.error(`Failed to load teams: ${teamsError.message}`)
          setError(teamsError.message)
        } else {
          setTeams((teamsData || []) as Team[])
        }
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : 'Unknown error'
        logger.error('Error loading teams', err, { context: 'profile_page' })
        toast.error(`Failed to load teams: ${errMsg}`)
        setError(errMsg)
      } finally {
        setLoadingTeams(false)
      }
    }
    loadTeams()
  }, [authProfile, authLoading, user, router, supabase])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)

    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser()
      if (!currentUser) throw new Error('Not authenticated')

      const { error: updateError } = await supabase
        .from('user_profiles')
        .update({
          first_name: formData.first_name,
          last_name: formData.last_name,
          father_name: formData.father_name,
          phone: formData.phone,
          emergency_contact: formData.emergency_contact,
          ehic_number: formData.ehic_number || null,
          campsite_staying: formData.campsite_staying,
          team_id: formData.team_id && formData.team_id !== 'none' && formData.team_id !== '' ? formData.team_id : null,
          university_name: formData.university_name || null,
          faculty_advisor_name: formData.faculty_advisor_name || null,
          faculty_advisor_position: formData.faculty_advisor_position || null,
          billing_address: formData.billing_address || null,
          vat_id: formData.vat_id || null,
          profile_completed: true,
        })
        .eq('id', currentUser.id)

      if (updateError) throw updateError

      await refetch()
      toast.success('Profile updated')

      const { data: updatedProfile, error: fetchError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', currentUser.id)
        .single()

      if (!fetchError && updatedProfile) {
        setFormData({
          first_name: updatedProfile.first_name || '',
          last_name: updatedProfile.last_name || '',
          father_name: updatedProfile.father_name || '',
          phone: updatedProfile.phone || '',
          emergency_contact: updatedProfile.emergency_contact || '',
          ehic_number: updatedProfile.ehic_number || '',
          campsite_staying: updatedProfile.campsite_staying || false,
          team_id: updatedProfile.team_id ? String(updatedProfile.team_id) : '',
          university_name: updatedProfile.university_name || '',
          faculty_advisor_name: updatedProfile.faculty_advisor_name || '',
          faculty_advisor_position: updatedProfile.faculty_advisor_position || '',
          billing_address: updatedProfile.billing_address || '',
          vat_id: updatedProfile.vat_id || '',
        })
        setError(null)
      }
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'Unknown error'
      setError(errMsg)
      if (errMsg.includes('permission') || errMsg.includes('policy') || errMsg.includes('RLS')) {
        toast.error('Permission denied. You may not update your profile.')
      } else {
        toast.error(`Update failed: ${errMsg}`)
      }
    } finally {
      setSaving(false)
    }
  }

  const selectedTeam = useMemo(
    () => (formData.team_id ? teams.find((t) => String(t.id) === formData.team_id) : null),
    [formData.team_id, teams]
  )

  if (authLoading) {
    return <LoadingSpinner fullScreen text="Loading..." />
  }

  if (!authProfile) {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Profile not found. Please contact support.</AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">My Profile</h1>
      <p className="text-sm text-gray-500 mb-6">Update your personal information.</p>

      {/* Account (read-only) */}
      <div className="mb-8 pb-6 border-b border-gray-200">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label className="text-xs font-medium text-gray-500">Email</Label>
            <p className="mt-1 text-gray-900 font-medium">{user?.email ?? '—'}</p>
          </div>
          <div>
            <Label className="text-xs font-medium text-gray-500">Role</Label>
            <p className="mt-1">
              <Badge variant="outline" className="font-normal">
                {authProfile.app_role ? formatUserRole(authProfile.app_role as never) : '—'}
              </Badge>
            </p>
          </div>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="first_name">First name *</Label>
            <Input
              id="first_name"
              value={formData.first_name}
              onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
              required
              placeholder="First name"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="last_name">Last name *</Label>
            <Input
              id="last_name"
              value={formData.last_name}
              onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
              required
              placeholder="Last name"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="father_name">Father&rsquo;s name *</Label>
          <Input
            id="father_name"
            value={formData.father_name}
            onChange={(e) => setFormData({ ...formData, father_name: e.target.value })}
            required
            placeholder="Father's name"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="phone">Phone *</Label>
            <Input
              id="phone"
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              required
              placeholder="+30..."
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="emergency_contact">Emergency contact *</Label>
            <Input
              id="emergency_contact"
              type="tel"
              value={formData.emergency_contact}
              onChange={(e) => setFormData({ ...formData, emergency_contact: e.target.value })}
              required
              placeholder="+30..."
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="ehic_number">EHIC number (optional)</Label>
          <Input
            id="ehic_number"
            value={formData.ehic_number}
            onChange={(e) => setFormData({ ...formData, ehic_number: e.target.value })}
            placeholder="European Health Insurance Card"
          />
        </div>

        <div className="space-y-2">
          <Label>Team *</Label>
          {loadingTeams ? (
            <div className="flex items-center gap-2 py-3 text-gray-500 text-sm">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading teams…
            </div>
          ) : (
            <Select
              value={formData.team_id && formData.team_id !== '' ? formData.team_id : 'none'}
              onValueChange={(value) => setFormData({ ...formData, team_id: value === 'none' ? '' : value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a team" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No team</SelectItem>
                {teams.map((team) => (
                  <SelectItem key={team.id} value={String(team.id)}>
                    {team.name} {team.code && `(${team.code})`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {selectedTeam && (
            <p className="text-xs text-gray-500">
              {selectedTeam.name} {selectedTeam.code && `(${selectedTeam.code})`}
            </p>
          )}
        </div>

        <div className="flex items-center gap-3">
          <Checkbox
            id="campsite_staying"
            checked={formData.campsite_staying}
            onCheckedChange={(checked) => setFormData({ ...formData, campsite_staying: checked === true })}
          />
          <Label htmlFor="campsite_staying" className="cursor-pointer text-sm font-normal">
            Staying at campsite
          </Label>
        </div>

        <div className="pt-2 text-sm font-medium text-gray-700">University & billing (optional)</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="university_name">University</Label>
            <Input
              id="university_name"
              value={formData.university_name}
              onChange={(e) => setFormData({ ...formData, university_name: e.target.value })}
              placeholder="e.g. International Hellenic University"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="faculty_advisor_name">Faculty advisor name</Label>
            <Input
              id="faculty_advisor_name"
              value={formData.faculty_advisor_name}
              onChange={(e) => setFormData({ ...formData, faculty_advisor_name: e.target.value })}
              placeholder="Full name"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="faculty_advisor_position">Faculty advisor position</Label>
            <Input
              id="faculty_advisor_position"
              value={formData.faculty_advisor_position}
              onChange={(e) => setFormData({ ...formData, faculty_advisor_position: e.target.value })}
              placeholder="e.g. Professor"
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="billing_address">Billing address</Label>
            <Input
              id="billing_address"
              value={formData.billing_address}
              onChange={(e) => setFormData({ ...formData, billing_address: e.target.value })}
              placeholder="Street, city, postal code, country"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="vat_id">VAT ID</Label>
            <Input
              id="vat_id"
              value={formData.vat_id}
              onChange={(e) => setFormData({ ...formData, vat_id: e.target.value })}
              placeholder="e.g. EL123456789"
            />
          </div>
        </div>

        <div className="flex gap-3 pt-4">
          <Button type="button" variant="outline" onClick={() => router.back()} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving…
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}
