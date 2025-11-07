'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import toast from 'react-hot-toast'
import { signUpSchema, SignUpInput } from '@/lib/validators'
import getSupabaseClient from '@/lib/supabase/client'

export default function SignUpPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [teams, setTeams] = useState<{ id: string, name: string, code: string }[]>([])
  const router = useRouter()

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<SignUpInput>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      fatherName: '',
      phone: '',
      emergencyContact: '',
      ehicNumber: '',
      teamId: '',
      campsiteStaying: false,
      teamLead: false,
      password: '',
      confirmPassword: '',
    },
  })

  const teamLead = watch('teamLead')

  useEffect(() => {
    const fetchTeams = async () => {
      const supabase = getSupabaseClient()
      const { data, error } = await supabase
        .from('teams')
        .select('id, name, code')
        .order('name')

      if (error) {
        toast.error('Failed to load teams')
        return
      }
      setTeams(data || [])
    }
    fetchTeams()
  }, [])

  const onSubmit = async (data: SignUpInput) => {
    setIsLoading(true)
    try {
      // Most fields should be required, but teamId is now optional!
      if (
        !data.firstName ||
        !data.lastName ||
        !data.fatherName ||
        !data.phone ||
        !data.emergencyContact ||
        !data.email ||
        !data.password
      ) {
        toast.error('Please fill all required fields')
        setIsLoading(false)
        return
      }

      const metadata = {
        first_name: data.firstName,
        last_name: data.lastName,
        father_name: data.fatherName,
        phone: data.phone,
        emergency_contact: data.emergencyContact,
        ehic_number: data.ehicNumber ? data.ehicNumber : null,
        team_id: data.teamId ? data.teamId : null, // nullable
        campsite_staying: !!data.campsiteStaying,
        team_lead: !!data.teamLead,
        app_role: data.teamLead ? 'team_leader' : 'viewer',
        profile_completed: false,
      }

      const supabase = getSupabaseClient()
      const { error: signupError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: { data: metadata },
      })

      if (signupError) {
        toast.error(signupError.message || 'Failed to create account')
        setIsLoading(false)
        return
      }

      toast.success('Account created! Please check your email and sign in.')
      router.push('/auth/signin')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create account')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">
      <div className="max-w-2xl w-full space-y-8 bg-white rounded-lg shadow-md p-8">
        <div className="text-left">
          <h2 className="text-2xl font-bold mb-2">Complete Your Profile</h2>
          <p className="text-sm text-gray-600 mb-4">
            Please provide your details to continue. Some fields can only be changed by an administrator.
          </p>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block font-medium">First Name</label>
              <input {...register('firstName')} className="form-input w-full" />
              {errors.firstName && <p className="text-red-600">{errors.firstName.message}</p>}
            </div>
            <div>
              <label className="block font-medium">Last Name</label>
              <input {...register('lastName')} className="form-input w-full" />
              {errors.lastName && <p className="text-red-600">{errors.lastName.message}</p>}
            </div>
          </div>
          <div>
            <label className="block font-medium mb-1">Email</label>
            <input
              type="email"
              {...register('email')}
              className="form-input w-full"
              placeholder="your.email@university.gr"
            />
            {errors.email && (
              <p className="text-sm text-red-600">{errors.email.message}</p>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block font-medium mb-1">Father's Name</label>
              <input
                type="text"
                {...register('fatherName')}
                className="form-input w-full"
                placeholder="Father's Name"
              />
              {errors.fatherName && (
                <p className="text-sm text-red-600">{errors.fatherName.message}</p>
              )}
            </div>
            <div>
              <label className="block font-medium mb-1">Phone</label>
              <input
                type="text"
                {...register('phone')}
                className="form-input w-full"
                placeholder="Phone Number"
              />
              {errors.phone && (
                <p className="text-sm text-red-600">{errors.phone.message}</p>
              )}
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block font-medium mb-1">Emergency Contact Number</label>
              <input
                type="text"
                {...register('emergencyContact')}
                className="form-input w-full"
                placeholder="Emergency Contact Number"
              />
              {errors.emergencyContact && (
                <p className="text-sm text-red-600">{errors.emergencyContact.message}</p>
              )}
            </div>
            <div>
              <label className="block font-medium mb-1">EHIC Number (optional)</label>
              <input
                type="text"
                {...register('ehicNumber')}
                className="form-input w-full"
                placeholder="EHIC Number"
              />
              {errors.ehicNumber && (
                <p className="text-sm text-red-600">{errors.ehicNumber.message}</p>
              )}
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
            <div>
              <label className="block font-medium mb-1">Team</label>
              <select {...register('teamId')} className="form-select w-full">
                <option value="">Select your team (optional)</option>
                {teams.map(team => (
                  <option key={team.id} value={team.id}>
                    {team.name} ({team.code})
                  </option>
                ))}
              </select>
              {errors.teamId && (
                <p className="text-sm text-red-600">{errors.teamId.message}</p>
              )}
            </div>
            <div className="flex items-center mt-6 md:mt-0">
              <input
                type="checkbox"
                {...register('campsiteStaying')}
                className="form-checkbox mr-2"
                id="campsiteStaying"
              />
              <label htmlFor="campsiteStaying" className="text-sm">
                Staying at campsite
              </label>
            </div>
          </div>
          <div>
            <label className="block font-medium mb-1">Role</label>
            <input
              type="text"
              disabled
              value={teamLead ? 'Team Leader' : 'User'}
              className="form-input w-full bg-gray-100"
              readOnly
            />
            <div className="flex items-center mt-2">
              <input
                type="checkbox"
                {...register('teamLead')}
                className="form-checkbox mr-2"
                id="teamLead"
              />
              <label htmlFor="teamLead" className="text-sm">
                I'm registering as a team leader
              </label>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Your role is assigned by an administrator.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block font-medium mb-1">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  {...register('password')}
                  className="form-input w-full pr-10"
                  placeholder="Create a password"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                >
                  {showPassword ? '🙈' : '👁️'}
                </button>
              </div>
              {errors.password && (
                <p className="text-sm text-red-600">{errors.password.message}</p>
              )}
            </div>
            <div>
              <label className="block font-medium mb-1">Confirm Password</label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  {...register('confirmPassword')}
                  className="form-input w-full pr-10"
                  placeholder="Confirm your password"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                >
                  {showConfirmPassword ? '🙈' : '👁️'}
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="text-sm text-red-600">{errors.confirmPassword.message}</p>
              )}
            </div>
          </div>
          <button type="submit" disabled={isLoading} className="w-full btn-primary mt-6">
            {isLoading ? 'Creating Account...' : 'Save Profile'}
          </button>
        </form>
      </div>
    </div>
  )
}
