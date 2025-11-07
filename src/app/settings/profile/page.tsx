'use client'

import { useState, useEffect } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Save, AlertCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import { Database } from '@/lib/types/database'
import { useAuth } from '@/hooks/useAuth'
import { LoadingSpinner } from '@/components/LoadingSpinner'

type UserProfile = Database['public']['Tables']['user_profiles']['Row']
type Team = Database['public']['Tables']['teams']['Row']

export default function ProfilePage() {
  const supabase = createClientComponentClient<Database>()
  const router = useRouter()
  const { user, profile: authProfile, loading: authLoading } = useAuth()
  const [saving, setSaving] = useState(false)
  const [teams, setTeams] = useState<Team[]>([])
  const [error, setError] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    father_name: '',
    phone: '',
    emergency_contact: '',
    ehic_number: '',
    campsite_staying: false,
    team_id: '',
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
        team_id: authProfile.team_id || '',
      })
    }

    // Load teams
    const loadTeams = async () => {
      const { data: teamsData } = await supabase
        .from('teams')
        .select('id, name, code')
        .order('name')
      setTeams(teamsData || [])
    }
    loadTeams()
  }, [authProfile, authLoading, user, router, supabase])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { error: updateError } = await (supabase
        .from('user_profiles') as any)
        .update({
          first_name: formData.first_name,
          last_name: formData.last_name,
          father_name: formData.father_name,
          phone: formData.phone,
          emergency_contact: formData.emergency_contact,
          ehic_number: formData.ehic_number || null,
          campsite_staying: formData.campsite_staying,
          team_id: formData.team_id || null,
          profile_completed: true,
        })
        .eq('id', user.id)

      if (updateError) throw updateError

      toast.success('Profile updated successfully')
      router.refresh()
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error')
      setError(error.message)
      toast.error('Failed to update profile')
    } finally {
      setSaving(false)
    }
  }

  if (authLoading) {
    return <LoadingSpinner fullScreen text="Loading profile..." />
  }

  if (!authProfile) {
    return (
      <div className="p-6">
        <Alert>
          <AlertCircle className="w-4 h-4" />
          <AlertDescription>Profile not found</AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">My Profile</h1>
        <p className="text-gray-600 mt-1">Manage your personal information and preferences</p>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Personal Information</CardTitle>
            <CardDescription>Update your personal details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="w-4 h-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="first_name">First Name</Label>
                <Input
                  id="first_name"
                  value={formData.first_name}
                  onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="last_name">Last Name</Label>
                <Input
                  id="last_name"
                  value={formData.last_name}
                  onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                  required
                />
              </div>
            </div>

            <div>
              <Label htmlFor="father_name">Father's Name</Label>
              <Input
                id="father_name"
                value={formData.father_name}
                onChange={(e) => setFormData({ ...formData, father_name: e.target.value })}
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="emergency_contact">Emergency Contact</Label>
                <Input
                  id="emergency_contact"
                  type="tel"
                  value={formData.emergency_contact}
                  onChange={(e) => setFormData({ ...formData, emergency_contact: e.target.value })}
                  required
                />
              </div>
            </div>

            <div>
              <Label htmlFor="ehic_number">EHIC Number (Optional)</Label>
              <Input
                id="ehic_number"
                value={formData.ehic_number}
                onChange={(e) => setFormData({ ...formData, ehic_number: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="team_id">Team</Label>
              <select
                id="team_id"
                value={formData.team_id}
                onChange={(e) => setFormData({ ...formData, team_id: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
              >
                <option value="">No team assigned</option>
                {teams.map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.name} ({team.code})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="campsite_staying"
                checked={formData.campsite_staying}
                onChange={(e) => setFormData({ ...formData, campsite_staying: e.target.checked })}
                className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
              />
              <Label htmlFor="campsite_staying" className="cursor-pointer">
                Staying at campsite
              </Label>
            </div>

            <div className="flex justify-end space-x-4 pt-4">
              <Button
                type="submit"
                disabled={saving}
                className="btn-primary"
                aria-busy={saving}
                aria-label={saving ? 'Saving changes' : 'Save changes'}
              >
                {saving ? (
                  <>
                    <div className="w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Save Changes
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  )
}

