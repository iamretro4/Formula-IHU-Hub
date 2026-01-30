'use client'

import Image from 'next/image'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import toast from 'react-hot-toast'
import { signUpSchema, SignUpInput } from '@/lib/validators'
import getSupabaseClient from '@/lib/supabase/client'
import { 
  Mail, Lock, User, Phone, Heart, FileText, Users, 
  CheckCircle2, Eye, EyeOff, Loader2, AlertCircle,
  Building2, Shield, KeyRound
} from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import {
  REGISTRATION_CATEGORY_ORDER,
  getCategoryLabel,
  getTeamsByCategory,
} from '@/lib/data/registration-teams'

export default function SignUpPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [teams, setTeams] = useState<{ id: string, name: string, code: string, vehicle_class?: string }[]>([])
  const [loadingTeams, setLoadingTeams] = useState(true)
  const [error, setError] = useState<string | null>(null)
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
      universityName: '',
      facultyAdvisorName: '',
      facultyAdvisorPosition: '',
      billingAddress: '',
      vatId: '',
      password: '',
      confirmPassword: '',
    },
  })

  const teamLead = watch('teamLead')
  const password = watch('password')

  // Password strength indicator
  const getPasswordStrength = (pwd: string) => {
    if (!pwd) return { strength: 0, label: '', color: '' }
    let strength = 0
    if (pwd.length >= 8) strength++
    if (/[a-z]/.test(pwd)) strength++
    if (/[A-Z]/.test(pwd)) strength++
    if (/[0-9]/.test(pwd)) strength++
    if (/[^A-Za-z0-9]/.test(pwd)) strength++
    
    const levels = [
      { label: 'Very Weak', color: 'bg-red-500' },
      { label: 'Weak', color: 'bg-orange-500' },
      { label: 'Fair', color: 'bg-yellow-500' },
      { label: 'Good', color: 'bg-blue-500' },
      { label: 'Strong', color: 'bg-green-500' },
    ]
    return { strength, ...levels[Math.min(strength - 1, 4)] }
  }

  const passwordStrength = getPasswordStrength(password || '')

  useEffect(() => {
    const fetchTeams = async () => {
      setLoadingTeams(true)
      try {
        const supabase = getSupabaseClient()
        const { data, error } = await supabase
          .from('teams')
          .select('id, name, code, vehicle_class')
          .order('name')

        if (error) {
          toast.error('Failed to load teams')
          setError('Failed to load teams. Please refresh the page.')
          return
        }
        setTeams(data || [])
      } catch (err) {
        toast.error('Failed to load teams')
        setError('Failed to load teams. Please refresh the page.')
      } finally {
        setLoadingTeams(false)
      }
    }
    fetchTeams()
  }, [])

  const isUuid = (s: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s)

  const onSubmit = async (data: SignUpInput) => {
    setIsLoading(true)
    setError(null)
    
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
        setError('Please fill all required fields')
        toast.error('Please fill all required fields')
        setIsLoading(false)
        return
      }

      let teamId: string | null = null
      if (data.teamId) {
        if (isUuid(data.teamId)) {
          teamId = data.teamId
        } else {
          const match = teams.find((t) => t.name === data.teamId)
          if (match) teamId = match.id
        }
      }

      const metadata = {
        first_name: data.firstName,
        last_name: data.lastName,
        father_name: data.fatherName,
        phone: data.phone,
        emergency_contact: data.emergencyContact,
        ehic_number: data.ehicNumber ? data.ehicNumber : null,
        team_id: teamId,
        campsite_staying: !!data.campsiteStaying,
        team_lead: !!data.teamLead,
        university_name: data.universityName || null,
        faculty_advisor_name: data.facultyAdvisorName || null,
        faculty_advisor_position: data.facultyAdvisorPosition || null,
        billing_address: data.billingAddress || null,
        vat_id: data.vatId || null,
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
        setError(signupError.message || 'Failed to create account')
        toast.error(signupError.message || 'Failed to create account')
        setIsLoading(false)
        return
      }

      toast.success('Account created! Please check your email and sign in.')
      router.push('/auth/signin')
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create account'
      setError(errorMessage)
      toast.error(errorMessage)
      setIsLoading(false)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-white to-primary/5 py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/5 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-primary/5 rounded-full blur-3xl"></div>
      </div>

      <div className="max-w-3xl w-full space-y-8 relative z-10 animate-fade-in">
        {/* Logo and Header */}
        <div className="text-center">
          <div className="mx-auto w-28 h-28 bg-white rounded-2xl flex items-center justify-center shadow-xl border border-gray-100 mb-6 p-3 transform hover:scale-105 transition-transform duration-300">
            <Image
              src="/formula-ihu-logo.png"
              alt="Formula IHU"
              width={88}
              height={88}
              className="w-full h-full object-contain"
              quality={90}
              priority
            />
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 tracking-tight mb-3">
            Create Your Account
          </h2>
          <p className="text-base text-gray-600">
            Please provide your details to get started. Some fields can only be changed by an administrator.
          </p>
        </div>

        {/* Form Card */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-2xl border border-gray-200/50 p-8 sm:p-10 hover:shadow-3xl transition-all duration-300">
          {error && (
            <Alert variant="destructive" className="mb-6 animate-fade-in">
              <AlertCircle className="w-4 h-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
            {/* Name Fields */}
            <div className="grid md:grid-cols-2 gap-5">
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                  <User className="w-4 h-4 text-gray-500" />
                  First Name <span className="text-red-500">*</span>
                </label>
                <input 
                  {...register('firstName')} 
                  className={`w-full px-4 py-3 rounded-lg border transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary/20 ${
                    errors.firstName 
                      ? 'border-red-300 bg-red-50 focus:border-red-500' 
                      : 'border-gray-300 bg-white focus:border-primary'
                  }`}
                  placeholder="John"
                  disabled={isLoading}
                />
                {errors.firstName && (
                  <p className="text-sm text-red-600 mt-2 flex items-center gap-1 animate-fade-in">
                    <AlertCircle className="w-4 h-4" />
                    {errors.firstName.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                  <User className="w-4 h-4 text-gray-500" />
                  Last Name <span className="text-red-500">*</span>
                </label>
                <input 
                  {...register('lastName')} 
                  className={`w-full px-4 py-3 rounded-lg border transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary/20 ${
                    errors.lastName 
                      ? 'border-red-300 bg-red-50 focus:border-red-500' 
                      : 'border-gray-300 bg-white focus:border-primary'
                  }`}
                  placeholder="Doe"
                  disabled={isLoading}
                />
                {errors.lastName && (
                  <p className="text-sm text-red-600 mt-2 flex items-center gap-1 animate-fade-in">
                    <AlertCircle className="w-4 h-4" />
                    {errors.lastName.message}
                  </p>
                )}
              </div>
            </div>

            {/* Email Field */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                <Mail className="w-4 h-4 text-gray-500" />
                Email <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                {...register('email')}
                className={`w-full px-4 py-3 rounded-lg border transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary/20 ${
                  errors.email 
                    ? 'border-red-300 bg-red-50 focus:border-red-500' 
                    : 'border-gray-300 bg-white focus:border-primary'
                }`}
                placeholder="your.email@university.gr"
                disabled={isLoading}
              />
              {errors.email && (
                <p className="text-sm text-red-600 mt-2 flex items-center gap-1 animate-fade-in">
                  <AlertCircle className="w-4 h-4" />
                  {errors.email.message}
                </p>
              )}
            </div>

            {/* Father's Name and Phone */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                  <User className="w-4 h-4 text-gray-500" />
                  Father&rsquo;s Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  {...register('fatherName')}
                  className={`w-full px-4 py-3 rounded-lg border transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary/20 ${
                    errors.fatherName 
                      ? 'border-red-300 bg-red-50 focus:border-red-500' 
                      : 'border-gray-300 bg-white focus:border-primary'
                  }`}
                  placeholder="Father&rsquo;s Name"
                  disabled={isLoading}
                />
                {errors.fatherName && (
                  <p className="text-sm text-red-600 mt-2 flex items-center gap-1 animate-fade-in">
                    <AlertCircle className="w-4 h-4" />
                    {errors.fatherName.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                  <Phone className="w-4 h-4 text-gray-500" />
                  Phone <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  {...register('phone')}
                  className={`w-full px-4 py-3 rounded-lg border transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary/20 ${
                    errors.phone 
                      ? 'border-red-300 bg-red-50 focus:border-red-500' 
                      : 'border-gray-300 bg-white focus:border-primary'
                  }`}
                  placeholder="+30 123 456 7890"
                  disabled={isLoading}
                />
                {errors.phone && (
                  <p className="text-sm text-red-600 mt-2 flex items-center gap-1 animate-fade-in">
                    <AlertCircle className="w-4 h-4" />
                    {errors.phone.message}
                  </p>
                )}
              </div>
            </div>

            {/* Emergency Contact and EHIC */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                  <Heart className="w-4 h-4 text-red-500" />
                  Emergency Contact <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  {...register('emergencyContact')}
                  className={`w-full px-4 py-3 rounded-lg border transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary/20 ${
                    errors.emergencyContact 
                      ? 'border-red-300 bg-red-50 focus:border-red-500' 
                      : 'border-gray-300 bg-white focus:border-primary'
                  }`}
                  placeholder="Emergency Contact Number"
                  disabled={isLoading}
                />
                {errors.emergencyContact && (
                  <p className="text-sm text-red-600 mt-2 flex items-center gap-1 animate-fade-in">
                    <AlertCircle className="w-4 h-4" />
                    {errors.emergencyContact.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-gray-500" />
                  EHIC Number <span className="text-gray-400 text-xs">(optional)</span>
                </label>
                <input
                  type="text"
                  {...register('ehicNumber')}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 bg-white focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all duration-200"
                  placeholder="EHIC Number"
                  disabled={isLoading}
                />
                {errors.ehicNumber && (
                  <p className="text-sm text-red-600 mt-2 flex items-center gap-1 animate-fade-in">
                    <AlertCircle className="w-4 h-4" />
                    {errors.ehicNumber.message}
                  </p>
                )}
              </div>
            </div>

            {/* University & Billing */}
            <div className="space-y-5">
              <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                <Building2 className="w-4 h-4 text-primary" />
                University & Billing
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-2 md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-gray-500" />
                    University Name <span className="text-gray-400 text-xs">(optional)</span>
                  </label>
                  <input
                    type="text"
                    {...register('universityName')}
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 bg-white focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all duration-200"
                    placeholder="e.g. International Hellenic University"
                    disabled={isLoading}
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Faculty Advisor Name <span className="text-gray-400 text-xs">(optional)</span>
                  </label>
                  <input
                    type="text"
                    {...register('facultyAdvisorName')}
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 bg-white focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all duration-200"
                    placeholder="Advisor full name"
                    disabled={isLoading}
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Faculty Advisor Position <span className="text-gray-400 text-xs">(optional)</span>
                  </label>
                  <input
                    type="text"
                    {...register('facultyAdvisorPosition')}
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 bg-white focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all duration-200"
                    placeholder="e.g. Professor, Department Head"
                    disabled={isLoading}
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Billing Address <span className="text-gray-400 text-xs">(optional)</span>
                  </label>
                  <input
                    type="text"
                    {...register('billingAddress')}
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 bg-white focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all duration-200"
                    placeholder="Street, city, postal code, country"
                    disabled={isLoading}
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    VAT ID <span className="text-gray-400 text-xs">(optional)</span>
                  </label>
                  <input
                    type="text"
                    {...register('vatId')}
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 bg-white focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all duration-200"
                    placeholder="e.g. EL123456789"
                    disabled={isLoading}
                  />
                </div>
              </div>
            </div>

            {/* Team Selection and Campsite */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-start">
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                  <Users className="w-4 h-4 text-gray-500" />
                  Team <span className="text-gray-400 text-xs">(optional)</span>
                </label>
                {loadingTeams ? (
                  <div className="flex items-center justify-center p-4 border border-gray-300 rounded-lg bg-gray-50">
                    <Loader2 className="w-5 h-5 animate-spin text-primary mr-2" />
                    <span className="text-gray-600 text-sm">Loading teams...</span>
                  </div>
                ) : (
                  <select 
                    {...register('teamId')} 
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 bg-white focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all duration-200"
                    disabled={isLoading}
                  >
                    <option value="">Select your team</option>
                    {REGISTRATION_CATEGORY_ORDER.map((category) => {
                      const teamNames = getTeamsByCategory().get(category) ?? []
                      if (teamNames.length === 0) return null
                      return (
                        <optgroup key={category} label={getCategoryLabel(category)}>
                          {teamNames.map((teamName) => {
                            const dbTeam = teams.find((t) => t.name === teamName)
                            const value = dbTeam ? dbTeam.id : teamName
                            return (
                              <option key={value} value={value}>
                                {teamName}
                                {dbTeam ? ` (${dbTeam.code})${dbTeam.vehicle_class ? ` - ${dbTeam.vehicle_class}` : ''}` : ''}
                              </option>
                            )
                          })}
                        </optgroup>
                      )
                    })}
                  </select>
                )}
                {errors.teamId && (
                  <p className="text-sm text-red-600 mt-2 flex items-center gap-1 animate-fade-in">
                    <AlertCircle className="w-4 h-4" />
                    {errors.teamId.message}
                  </p>
                )}
              </div>
              <div className="flex items-center mt-8 md:mt-0 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <input
                  type="checkbox"
                  {...register('campsiteStaying')}
                  className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary focus:ring-2"
                  id="campsiteStaying"
                  disabled={isLoading}
                />
                <label htmlFor="campsiteStaying" className="ml-3 text-sm font-medium text-gray-700">
                  Staying at campsite
                </label>
              </div>
            </div>

            {/* Role Selection */}
            <div className="bg-gradient-to-r from-gray-50 to-gray-100/50 rounded-lg p-5 border border-gray-200">
              <label className="block text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <Shield className="w-4 h-4 text-gray-500" />
                Role
              </label>
              <div className="space-y-3">
                <div className="p-3 bg-white rounded-lg border border-gray-200">
                  <input
                    type="text"
                    disabled
                    value={teamLead ? 'Team Leader' : 'Viewer'}
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 bg-gray-100 text-gray-600 cursor-not-allowed text-sm font-medium"
                    readOnly
                  />
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    {...register('teamLead')}
                    className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary focus:ring-2"
                    id="teamLead"
                    disabled={isLoading}
                  />
                  <label htmlFor="teamLead" className="ml-3 text-sm font-medium text-gray-700">
                    I&rsquo;m registering as a team leader
                  </label>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Your role is assigned by an administrator. Team leaders have additional permissions.
                </p>
              </div>
            </div>

            {/* Password Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                  <KeyRound className="w-4 h-4 text-gray-500" />
                  Password <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    {...register('password')}
                    className={`w-full px-4 py-3 pr-12 rounded-lg border transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary/20 ${
                      errors.password 
                        ? 'border-red-300 bg-red-50 focus:border-red-500' 
                        : 'border-gray-300 bg-white focus:border-primary'
                    }`}
                    placeholder="Create a password"
                    autoComplete="new-password"
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
                    disabled={isLoading}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                {password && (
                  <div className="mt-2 space-y-1">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div 
                          className={`h-full transition-all duration-300 ${passwordStrength.color}`}
                          style={{ width: `${(passwordStrength.strength / 5) * 100}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-600 font-medium">{passwordStrength.label}</span>
                    </div>
                  </div>
                )}
                {errors.password && (
                  <p className="text-sm text-red-600 mt-2 flex items-center gap-1 animate-fade-in">
                    <AlertCircle className="w-4 h-4" />
                    {errors.password.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                  <KeyRound className="w-4 h-4 text-gray-500" />
                  Confirm Password <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    {...register('confirmPassword')}
                    className={`w-full px-4 py-3 pr-12 rounded-lg border transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary/20 ${
                      errors.confirmPassword 
                        ? 'border-red-300 bg-red-50 focus:border-red-500' 
                        : 'border-gray-300 bg-white focus:border-primary'
                    }`}
                    placeholder="Confirm your password"
                    autoComplete="new-password"
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
                    disabled={isLoading}
                    aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                  >
                    {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                {errors.confirmPassword && (
                  <p className="text-sm text-red-600 mt-2 flex items-center gap-1 animate-fade-in">
                    <AlertCircle className="w-4 h-4" />
                    {errors.confirmPassword.message}
                  </p>
                )}
              </div>
            </div>

            {/* Submit Button */}
            <button 
              type="submit" 
              disabled={isLoading} 
              className="w-full bg-gradient-to-r from-primary via-primary/90 to-primary hover:from-primary/90 hover:via-primary hover:to-primary/90 text-white font-semibold py-3.5 px-6 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:ring-offset-2 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-lg flex items-center justify-center gap-2 transform hover:scale-[1.02] active:scale-[0.98] mt-6"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Creating Account...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-5 h-5" />
                  <span>Create Account</span>
                </>
              )}
            </button>

            {/* Footer Link */}
            <p className="text-center text-sm text-gray-600 mt-4">
              Already have an account?{' '}
              <Link 
                href="/auth/signin" 
                className="text-primary hover:text-primary/80 font-semibold transition-colors underline-offset-2 hover:underline"
              >
                Sign in here
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  )
}
