'use client'

import { useState, useEffect, useMemo } from 'react'
import getSupabaseClient from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Save, AlertCircle, User, Mail, Shield, Users, Phone, Heart, FileText, CheckCircle2, XCircle, Loader2, Building2, MapPin } from 'lucide-react'
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

  const profileStats = useMemo(() => {
    if (!authProfile) return null
    
    const requiredFields = [
      authProfile.first_name,
      authProfile.last_name,
      authProfile.father_name,
      authProfile.phone,
      authProfile.emergency_contact,
      authProfile.team_id,
    ]
    
    const completedFields = requiredFields.filter(field => field && field !== '').length
    const totalFields = requiredFields.length
    const completionPercentage = Math.round((completedFields / totalFields) * 100)
    
    return {
      completedFields,
      totalFields,
      completionPercentage,
      isComplete: authProfile.profile_completed || false,
    }
  }, [authProfile])

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

    // Load teams
    const loadTeams = async () => {
      setLoadingTeams(true)
      try {
        const { data: teamsData, error: teamsError } = await supabase
          .from('teams')
          .select('id, name, code, vehicle_class')
          .order('name')
        
        if (teamsError) {
          console.error('Error loading teams:', teamsError)
          logger.error('Failed to load teams', teamsError, { context: 'profile_page' })
          toast.error(`Failed to load teams: ${teamsError.message}`)
          setError(`Failed to load teams: ${teamsError.message}`)
        } else {
          setTeams((teamsData || []) as any)
          if (teamsData && teamsData.length === 0) {
            logger.warn('No teams found in database', { context: 'profile_page' })
          }
        }
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Unknown error')
        logger.error('Error loading teams', err, { context: 'profile_page' })
        toast.error(`Failed to load teams: ${error.message}`)
        setError(error.message)
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
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

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
          team_id: (formData.team_id && formData.team_id !== "none" && formData.team_id !== "") ? formData.team_id : null,
          university_name: formData.university_name || null,
          faculty_advisor_name: formData.faculty_advisor_name || null,
          faculty_advisor_position: formData.faculty_advisor_position || null,
          billing_address: formData.billing_address || null,
          vat_id: formData.vat_id || null,
          profile_completed: true,
        })
        .eq('id', user.id)

      if (updateError) {
        logger.error('Profile update error', updateError, { 
          context: 'profile_update',
          updateData: {
            team_id: formData.team_id,
            team_id_type: typeof formData.team_id
          }
        })
        throw updateError
      }
      
      logger.debug('Profile update request successful', {
        team_id_sent: formData.team_id,
        context: 'profile_update'
      })

      // Reload the profile from AuthContext
      await refetch()
      
      toast.success('Profile updated successfully!')
      
      // Update local form data to reflect changes - wait a bit for DB to be consistent
      await new Promise(resolve => setTimeout(resolve, 300))
      
      const { data: updatedProfile, error: fetchError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', user.id)
        .single()
      
      if (fetchError) {
        logger.error('Failed to fetch updated profile', fetchError, { context: 'profile_refresh' })
      }
      
      if (updatedProfile) {
        const newTeamId = updatedProfile.team_id ? String(updatedProfile.team_id) : ''
        logger.debug('Profile updated successfully', { 
          team_id: updatedProfile.team_id,
          team_id_string: newTeamId,
          context: 'profile_update_success' 
        })
        setFormData({
          first_name: updatedProfile.first_name || '',
          last_name: updatedProfile.last_name || '',
          father_name: updatedProfile.father_name || '',
          phone: updatedProfile.phone || '',
          emergency_contact: updatedProfile.emergency_contact || '',
          ehic_number: updatedProfile.ehic_number || '',
          campsite_staying: updatedProfile.campsite_staying || false,
          team_id: newTeamId,
          university_name: updatedProfile.university_name || '',
          faculty_advisor_name: updatedProfile.faculty_advisor_name || '',
          faculty_advisor_position: updatedProfile.faculty_advisor_position || '',
          billing_address: updatedProfile.billing_address || '',
          vat_id: updatedProfile.vat_id || '',
        })
        // Clear any errors
        setError(null)
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error')
      logger.error('Profile update failed', err, { context: 'profile_update', formData })
      setError(error.message)
      
      // Check for specific error types
      if (error.message.includes('permission') || error.message.includes('policy') || error.message.includes('RLS')) {
        toast.error('Permission denied. You may not have permission to update your profile.')
      } else {
        toast.error(`Failed to update profile: ${error.message}`)
      }
    } finally {
      setSaving(false)
    }
  }

  const selectedTeam = useMemo(() => {
    if (!formData.team_id || formData.team_id === '') return null
    return teams.find(t => String(t.id) === formData.team_id)
  }, [formData.team_id, teams])

  if (authLoading) {
    return <LoadingSpinner fullScreen text="Loading profile..." />
  }

  if (!authProfile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 p-6">
        <div className="max-w-4xl mx-auto">
          <Alert variant="destructive" className="animate-fade-in">
            <AlertCircle className="w-4 h-4" />
            <AlertDescription>Profile not found. Please contact support.</AlertDescription>
          </Alert>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-5xl mx-auto space-y-6 animate-fade-in">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-primary/20 to-primary/10 rounded-xl">
                <User className="w-6 h-6 sm:w-7 sm:h-7 text-primary" />
              </div>
              My Profile
            </h1>
            <p className="text-gray-600 mt-2 text-sm sm:text-base">Manage your personal information and preferences</p>
          </div>
          {profileStats && (
            <div className="flex items-center gap-2">
              {profileStats.isComplete ? (
                <Badge variant="default" className="bg-green-100 text-green-700 border-green-300 px-3 py-1.5 text-sm font-semibold">
                  <CheckCircle2 className="w-4 h-4 mr-1.5" />
                  Profile Complete
                </Badge>
              ) : (
                <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300 px-3 py-1.5 text-sm font-semibold">
                  <XCircle className="w-4 h-4 mr-1.5" />
                  {profileStats.completionPercentage}% Complete
                </Badge>
              )}
            </div>
          )}
        </div>

        {/* Profile Stats Cards */}
        {profileStats && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="bg-gradient-to-br from-blue-50 to-blue-100/50 border-blue-200 hover:shadow-lg transition-all duration-300">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-blue-700 font-medium">Completion</p>
                    <p className="text-2xl font-bold text-blue-900 mt-1">{profileStats.completionPercentage}%</p>
                  </div>
                  <div className="p-2 bg-blue-200/50 rounded-lg">
                    <FileText className="w-5 h-5 text-blue-700" />
                  </div>
                </div>
                <div className="mt-3 h-2 bg-blue-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-500"
                    style={{ width: `${profileStats.completionPercentage}%` }}
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-purple-50 to-purple-100/50 border-purple-200 hover:shadow-lg transition-all duration-300">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-purple-700 font-medium">Fields Filled</p>
                    <p className="text-2xl font-bold text-purple-900 mt-1">
                      {profileStats.completedFields}/{profileStats.totalFields}
                    </p>
                  </div>
                  <div className="p-2 bg-purple-200/50 rounded-lg">
                    <CheckCircle2 className="w-5 h-5 text-purple-700" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-green-50 to-green-100/50 border-green-200 hover:shadow-lg transition-all duration-300">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-green-700 font-medium">Team</p>
                    <p className="text-lg font-bold text-green-900 mt-1">
                      {selectedTeam ? selectedTeam.name : 'Not Assigned'}
                    </p>
                  </div>
                  <div className="p-2 bg-green-200/50 rounded-lg">
                    <Users className="w-5 h-5 text-green-700" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Account Information Card */}
        <Card className="border-2 border-gray-200 shadow-lg hover:shadow-xl transition-all duration-300">
          <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100/50 border-b border-gray-200">
            <CardTitle className="flex items-center gap-2 text-xl">
              <div className="p-1.5 bg-primary/10 rounded-lg">
                <Shield className="w-5 h-5 text-primary" />
              </div>
              Account Information
            </CardTitle>
            <CardDescription>Your account details (read-only)</CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <Mail className="w-4 h-4 text-gray-500" />
                  Email Address
                </Label>
                <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                  <p className="text-gray-900 font-medium">{user?.email || 'N/A'}</p>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <Shield className="w-4 h-4 text-gray-500" />
                  Role
                </Label>
                <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                  <Badge variant="outline" className="text-sm font-semibold">
                    {authProfile.app_role ? formatUserRole(authProfile.app_role as any) : 'N/A'}
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Personal Information Form */}
        <form onSubmit={handleSubmit}>
          <Card className="border-2 border-gray-200 shadow-lg hover:shadow-xl transition-all duration-300">
            <CardHeader className="bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10 border-b border-gray-200">
              <CardTitle className="flex items-center gap-2 text-xl">
                <div className="p-1.5 bg-primary/20 rounded-lg">
                  <User className="w-5 h-5 text-primary" />
                </div>
                Personal Information
              </CardTitle>
              <CardDescription>Update your personal details and preferences</CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              {error && (
                <Alert variant="destructive" className="animate-fade-in">
                  <AlertCircle className="w-4 h-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {/* Name Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="first_name" className="text-sm font-semibold text-gray-700">
                    First Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="first_name"
                    value={formData.first_name}
                    onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                    required
                    className="h-11"
                    placeholder="Enter your first name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="last_name" className="text-sm font-semibold text-gray-700">
                    Last Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="last_name"
                    value={formData.last_name}
                    onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                    required
                    className="h-11"
                    placeholder="Enter your last name"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="father_name" className="text-sm font-semibold text-gray-700">
                  Father&rsquo;s Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="father_name"
                  value={formData.father_name}
                  onChange={(e) => setFormData({ ...formData, father_name: e.target.value })}
                  required
                  className="h-11"
                  placeholder="Enter your father&rsquo;s name"
                />
              </div>

              {/* Contact Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                    <Phone className="w-4 h-4 text-gray-500" />
                    Phone <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    required
                    className="h-11"
                    placeholder="+1234567890"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="emergency_contact" className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                    <Heart className="w-4 h-4 text-red-500" />
                    Emergency Contact <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="emergency_contact"
                    type="tel"
                    value={formData.emergency_contact}
                    onChange={(e) => setFormData({ ...formData, emergency_contact: e.target.value })}
                    required
                    className="h-11"
                    placeholder="+1234567890"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="ehic_number" className="text-sm font-semibold text-gray-700">
                  EHIC Number <span className="text-gray-500 text-xs">(Optional)</span>
                </Label>
                <Input
                  id="ehic_number"
                  value={formData.ehic_number}
                  onChange={(e) => setFormData({ ...formData, ehic_number: e.target.value })}
                  className="h-11"
                  placeholder="Enter your EHIC number"
                />
                <p className="text-xs text-gray-500 mt-1">European Health Insurance Card number</p>
              </div>

              {/* University & Billing */}
              <div className="space-y-4 pt-2 border-t border-gray-200">
                <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                  <Building2 className="w-4 h-4 text-primary" />
                  University & Billing
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="university_name" className="text-sm font-semibold text-gray-700">
                      University Name <span className="text-gray-500 text-xs">(Optional)</span>
                    </Label>
                    <Input
                      id="university_name"
                      value={formData.university_name}
                      onChange={(e) => setFormData({ ...formData, university_name: e.target.value })}
                      className="h-11"
                      placeholder="e.g. International Hellenic University"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="faculty_advisor_name" className="text-sm font-semibold text-gray-700">
                      Faculty Advisor Name <span className="text-gray-500 text-xs">(Optional)</span>
                    </Label>
                    <Input
                      id="faculty_advisor_name"
                      value={formData.faculty_advisor_name}
                      onChange={(e) => setFormData({ ...formData, faculty_advisor_name: e.target.value })}
                      className="h-11"
                      placeholder="Advisor full name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="faculty_advisor_position" className="text-sm font-semibold text-gray-700">
                      Faculty Advisor Position <span className="text-gray-500 text-xs">(Optional)</span>
                    </Label>
                    <Input
                      id="faculty_advisor_position"
                      value={formData.faculty_advisor_position}
                      onChange={(e) => setFormData({ ...formData, faculty_advisor_position: e.target.value })}
                      className="h-11"
                      placeholder="e.g. Professor, Department Head"
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="billing_address" className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-gray-500" />
                      Billing Address <span className="text-gray-500 text-xs">(Optional)</span>
                    </Label>
                    <Input
                      id="billing_address"
                      value={formData.billing_address}
                      onChange={(e) => setFormData({ ...formData, billing_address: e.target.value })}
                      className="h-11"
                      placeholder="Street, city, postal code, country"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="vat_id" className="text-sm font-semibold text-gray-700">
                      VAT ID <span className="text-gray-500 text-xs">(Optional)</span>
                    </Label>
                    <Input
                      id="vat_id"
                      value={formData.vat_id}
                      onChange={(e) => setFormData({ ...formData, vat_id: e.target.value })}
                      className="h-11"
                      placeholder="e.g. EL123456789"
                    />
                  </div>
                </div>
              </div>

              {/* Team Selection */}
              <div className="space-y-2">
                <Label htmlFor="team_id" className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <Users className="w-4 h-4 text-gray-500" />
                  Team <span className="text-red-500">*</span>
                </Label>
                {loadingTeams ? (
                  <div className="flex items-center justify-center p-8 border border-gray-200 rounded-lg bg-gray-50">
                    <Loader2 className="w-5 h-5 animate-spin text-primary mr-2" />
                    <span className="text-gray-600">Loading teams...</span>
                  </div>
                ) : (
                  <Select
                    key={`team-select-${formData.team_id || 'none'}`}
                    value={formData.team_id && formData.team_id !== "" ? formData.team_id : "none"}
                    onValueChange={(value) => {
                      const newTeamId = value === "none" ? "" : value
                      logger.debug('Team selection changed', { oldValue: formData.team_id, newValue: newTeamId })
                      setFormData({ ...formData, team_id: newTeamId })
                    }}
                  >
                    <SelectTrigger className="w-full h-11">
                      <SelectValue placeholder="Select a team" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No team assigned</SelectItem>
                      {teams.map((team) => (
                        <SelectItem key={team.id} value={String(team.id)}>
                          <div className="flex items-center gap-2">
                            <span>{team.name}</span>
                            <Badge variant="outline" className="text-xs">
                              {team.code}
                            </Badge>
                            {team.vehicle_class && (
                              <Badge variant="outline" className="text-xs">
                                {team.vehicle_class}
                              </Badge>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                {selectedTeam && (
                  <p className="text-xs text-gray-500 mt-1">
                    Selected: <span className="font-semibold">{selectedTeam.name}</span> ({selectedTeam.code})
                  </p>
                )}
              </div>

              {/* Campsite Staying */}
              <div className="flex items-start space-x-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <Checkbox
                  id="campsite_staying"
                  checked={formData.campsite_staying}
                  onCheckedChange={(checked) => setFormData({ ...formData, campsite_staying: checked === true })}
                  className="mt-1"
                />
                <div className="flex-1">
                  <Label htmlFor="campsite_staying" className="cursor-pointer text-sm font-semibold text-gray-700">
                    Staying at campsite
                  </Label>
                  <p className="text-xs text-gray-500 mt-1">Check this if you will be staying at the event campsite</p>
                </div>
              </div>

              {/* Submit Button */}
              <div className="flex justify-end space-x-4 pt-4 border-t border-gray-200">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.back()}
                  disabled={saving}
                  className="h-11 px-6"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={saving}
                  className="h-11 px-8 bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary shadow-lg hover:shadow-xl transition-all duration-300"
                  aria-busy={saving}
                  aria-label={saving ? 'Saving changes' : 'Save changes'}
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
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
    </div>
  )
}
