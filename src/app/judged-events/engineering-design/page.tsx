'use client'
import { use, useEffect, useState, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import getSupabaseClient from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { Database } from '@/lib/types/database'
import { useForm, SubmitHandler } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { 
  Loader2, 
  Save, 
  CheckCircle, 
  Edit, 
  ThumbsUp, 
  ThumbsDown, 
  Award,
  Users,
  Calendar,
  AlertCircle,
  CheckCircle2,
  XCircle,
  FileText,
  TrendingUp,
  Clock,
  MessageSquare
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import toast from 'react-hot-toast'
import { logger } from '@/lib/utils/logger'

type ScoreStatus = 'pending' | 'approved' | 'rejected'

type UserProfile = {
  id: string
  app_role: string
  first_name: string
  last_name: string
}

type Team = {
  id: string
  code: string
  name: string
}

type JudgedEventBooking = {
  id: string
  event_id: string
  team_id: string
  scheduled_time?: string
  teams?: Team
}

type JudgedEventCriterion = {
  id: string
  event_id: string
  title: string
  max_score: number
  criterion_index: number
}

type JudgedEventScore = {
  id: string
  booking_id: string
  criterion_id: string
  judge_id: string
  score: number | null
  comment?: string
  submitted_at: string
  status: ScoreStatus
  judged_event_bookings?: {
    teams?: Team
  }
  user_profiles?: {
    first_name: string
    last_name: string
    app_role: string
  }
}

const eventId = 'e8447aed-c7a5-4fc7-b198-67ae4a410434' // Engineering Design Event UUID

const scoreEntrySchema = z.object({
  criterion_id: z.string().uuid(),
  score: z.coerce.number().min(0, 'Score cannot be negative').nullable(),
  comment: z.string().optional(),
});
const scoringFormSchema = z.object({
  bookingId: z.string().uuid('Please select a booking.'),
  scores: z.array(scoreEntrySchema),
});
type ScoringFormData = z.infer<typeof scoringFormSchema>;

type PageProps = {
  params: Promise<{ bookingId: string }>
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

export default function DesignEventScore({ params, searchParams }: PageProps) {
  const { bookingId: paramBookingId } = use(params)
  use(searchParams ?? Promise.resolve({}))
  const router = useRouter()
  const { profile: authProfile } = useAuth()
  const supabase = useMemo(() => getSupabaseClient(), [])
  const effectRunIdRef = useRef(0)
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null)

  // Temporarily admin-only
  useEffect(() => {
    if (authProfile === undefined) return
    if (authProfile?.app_role !== 'admin') router.replace('/dashboard')
  }, [authProfile, router])
  const [bookings, setBookings] = useState<JudgedEventBooking[]>([])
  const [criteria, setCriteria] = useState<JudgedEventCriterion[]>([])
  const [submittedScores, setSubmittedScores] = useState<JudgedEventScore[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [approvingBookingId, setApprovingBookingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [editingScore, setEditingScore] = useState<JudgedEventScore | null>(null)
  const [editValue, setEditValue] = useState<number | null>(null)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isDirty },
  } = useForm<ScoringFormData>({
    resolver: zodResolver(scoringFormSchema),
    defaultValues: {
      bookingId: paramBookingId || '',
      scores: [],
    },
  });

  const selectedBookingId = watch('bookingId');
  const formScores = watch('scores');

  useEffect(() => {
    const currentRunId = ++effectRunIdRef.current
    let active = true
    
    async function loadInitialData() {
      if (currentRunId !== effectRunIdRef.current) return
      setIsLoading(true);
      setError(null);
      try {
        // 1. User/profile
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (!active || currentRunId !== effectRunIdRef.current) return
        if (userError) throw userError;
        if (!user) throw new Error('User not authenticated');
        const { data: profileData, error: profileError } = await supabase
          .from('user_profiles')
          .select('id, app_role, first_name, last_name')
          .eq('id', user.id)
          .single() as { data: UserProfile | null, error: any }
        if (!active || currentRunId !== effectRunIdRef.current) return
        if (profileError) throw profileError;
        if (active && currentRunId === effectRunIdRef.current) {
          setCurrentUser(profileData);
        }

        // 2. Bookings
        const { data: bookingsData, error: bookingsError } = await supabase
          .from('judged_event_bookings')
          .select('*, teams:team_id(id, code, name)')
          .eq('event_id', eventId)
          .order('scheduled_time')
        if (!active || currentRunId !== effectRunIdRef.current) return
        if (bookingsError) throw bookingsError;
        if (active && currentRunId === effectRunIdRef.current) {
          setBookings((bookingsData || []) as JudgedEventBooking[]);
        }

        // 3. Criteria
        const { data: criteriaData, error: criteriaError } = await supabase
          .from('judged_event_criteria')
          .select('*')
          .eq('event_id', eventId)
          .order('criterion_index')
        if (!active || currentRunId !== effectRunIdRef.current) return
        if (criteriaError) throw criteriaError;
        if (active && currentRunId === effectRunIdRef.current) {
          setCriteria((criteriaData || []) as JudgedEventCriterion[]);
        }

        // 4. Scores panel
        const criterionIds = criteriaData?.map((c: any) => c.id) || [];
        let allScoresQuery = supabase
          .from('judged_event_scores')
          .select(`
            id, score, comment, judge_id, criterion_id, status, submitted_at, booking_id,
            judged_event_bookings(team_id, teams:team_id(name, code)),
            user_profiles(first_name, last_name, app_role)
          `);
        if (criterionIds.length > 0) {
          allScoresQuery = allScoresQuery.in('criterion_id', criterionIds);
        }
        const { data: allScores, error: allScoresError } = await allScoresQuery
          .order('submitted_at', { ascending: false });
        if (!active || currentRunId !== effectRunIdRef.current) return
        if (allScoresError) throw allScoresError;
        if (active && currentRunId === effectRunIdRef.current) {
          setSubmittedScores((allScores || []) as unknown as JudgedEventScore[]);
        }
      } catch (err) {
        if (active && currentRunId === effectRunIdRef.current) {
          const error = err instanceof Error ? err : new Error('Unknown error')
          setError(error.message);
          toast.error(error.message);
          logger.error('[Design Event] Error loading data', err);
        }
      } finally {
        if (active && currentRunId === effectRunIdRef.current) {
          setIsLoading(false);
        }
      }
    }
    loadInitialData();
    return () => { active = false }
  }, [supabase]);

  // Per-booking score form populator
  useEffect(() => {
    if (selectedBookingId && criteria.length > 0 && currentUser) {
      setError(null);
      async function loadScoresForBooking() {
        if (!currentUser) return;
        
        const { data: existingScores, error: scoresError } = await supabase
          .from('judged_event_scores')
          .select('*')
          .eq('booking_id', selectedBookingId)
          .eq('judge_id', currentUser.id);
        if (scoresError) throw scoresError;
        const initialScores = criteria.map(criterion => {
          const existing = (existingScores as any[])?.find((s: any) => s.criterion_id === criterion.id);
          return {
            criterion_id: criterion.id,
            score: existing?.score ?? null,
            comment: existing?.comment ?? '',
          };
        });
        reset({ bookingId: selectedBookingId, scores: initialScores });
      }
      loadScoresForBooking();
    } else {
      reset({ bookingId: selectedBookingId, scores: [] });
    }
  }, [selectedBookingId, criteria, currentUser, reset, supabase]);

  const currentBooking = useMemo(() => {
    return bookings.find(b => b.id === selectedBookingId);
  }, [selectedBookingId, bookings]);

  const totalScore = useMemo(() => {
    return formScores.reduce((sum, entry) => sum + (entry.score || 0), 0);
  }, [formScores]);

  // Group scores by booking for bulk approval
  const scoresByBooking = useMemo(() => {
    const grouped: Record<string, JudgedEventScore[]> = {};
    submittedScores.forEach(score => {
      if (!grouped[score.booking_id]) {
        grouped[score.booking_id] = [];
      }
      grouped[score.booking_id].push(score);
    });
    return grouped;
  }, [submittedScores]);

  // --- ROLE LOGIC ---
  const role = currentUser?.app_role;
  const canScore = role === 'admin' || role?.startsWith('design_judge') || role === 'design_judge_overall';
  const canEditAll = role === 'admin' || role === 'design_judge_overall';
  const canViewOnly = role === 'team_leader' || role === 'viewer';

  // --- HANDLERS ---
  const onSubmit: SubmitHandler<ScoringFormData> = async (data) => {
    setIsSaving(true);
    setError(null);
    setSuccessMessage(null);
    try {
      if (!currentBooking) throw new Error('No booking selected.');
      const payload = data.scores.map(scoreEntry => {
        const criterion = criteria.find(c => c.id === scoreEntry.criterion_id);
        if (!criterion) throw new Error(`Criterion not found for ID: ${scoreEntry.criterion_id}`);
        if (scoreEntry.score !== null && scoreEntry.score > criterion.max_score) {
          throw new Error(`Score for ${criterion.title} cannot exceed ${criterion.max_score}.`);
        }
        return {
          booking_id: data.bookingId,
          criterion_id: scoreEntry.criterion_id,
          judge_id: currentUser?.id,
          score: scoreEntry.score,
          comment: scoreEntry.comment,
          submitted_at: new Date().toISOString(),
          status: 'pending' as ScoreStatus,
        };
      });
      const { error: upsertError } = await supabase
        .from('judged_event_scores')
        .upsert(payload as any, { onConflict: 'booking_id,criterion_id,judge_id' });
      if (upsertError) throw upsertError;

      toast.success('Scores saved successfully!');
      await refreshScoresPanel();
      reset(data);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error')
      setError(error.message);
      toast.error(error.message);
      logger.error('[Design Event] Error saving scores', err);
    } finally {
      setIsSaving(false);
    }
  };

  async function handleApproveAll(bookingId: string) {
    if (!confirm('Approve all scores for this design slot? This will approve all categories at once.')) {
      return;
    }
    
    setApprovingBookingId(bookingId);
    try {
      const { error: updateError } = await supabase
        .from('judged_event_scores')
        .update({ status: 'approved' } as any)
        .eq('booking_id', bookingId);
      
      if (updateError) throw updateError;
      
      toast.success('All scores approved successfully!');
      await refreshScoresPanel();
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error')
      toast.error(error.message || 'Failed to approve scores');
      logger.error('[Design Event] Error approving all scores', err);
    } finally {
      setApprovingBookingId(null);
    }
  }

  async function handleRejectAll(bookingId: string) {
    if (!confirm('Reject all scores for this design slot? This will reject all categories at once.')) {
      return;
    }
    
    setApprovingBookingId(bookingId);
    try {
      const { error: updateError } = await supabase
        .from('judged_event_scores')
        .update({ status: 'rejected' } as any)
        .eq('booking_id', bookingId);
      
      if (updateError) throw updateError;
      
      toast.success('All scores rejected');
      await refreshScoresPanel();
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error')
      toast.error(error.message || 'Failed to reject scores');
      logger.error('[Design Event] Error rejecting all scores', err);
    } finally {
      setApprovingBookingId(null);
    }
  }

  async function handleApprove(id: string) {
    try {
      const { error: updateError } = await supabase
        .from('judged_event_scores')
        .update({ status: 'approved' } as any)
        .eq('id', id);
      
      if (updateError) throw updateError;
      
      toast.success('Score approved');
      await refreshScoresPanel();
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error')
      toast.error(error.message || 'Failed to approve score');
    }
  }

  async function handleReject(id: string) {
    try {
      const { error: updateError } = await supabase
        .from('judged_event_scores')
        .update({ status: 'rejected' } as any)
        .eq('id', id);
      
      if (updateError) throw updateError;
      
      toast.success('Score rejected');
      await refreshScoresPanel();
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error')
      toast.error(error.message || 'Failed to reject score');
    }
  }

  function handleEdit(score: JudgedEventScore) {
    setEditingScore(score)
    setEditValue(score.score)
  }

  async function handleSaveEdit() {
    if (editingScore && editValue != null) {
      try {
        const { error: updateError } = await supabase
          .from('judged_event_scores')
          .update({ score: editValue } as any)
          .eq('id', editingScore.id);
        
        if (updateError) throw updateError;
        
        toast.success('Score updated');
        setEditingScore(null)
        setEditValue(null)
        await refreshScoresPanel();
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Unknown error')
        toast.error(error.message || 'Failed to update score');
      }
    }
  }

  async function refreshScoresPanel() {
    const criterionIds = criteria?.map(c => c.id) || [];
    let updatedScoresQuery = supabase.from('judged_event_scores')
      .select(`id, score, comment, judge_id, criterion_id, status, submitted_at, booking_id, judged_event_bookings(team_id, teams:team_id(name, code)), user_profiles(first_name, last_name, app_role)`);
    if (criterionIds.length > 0) {
      updatedScoresQuery = updatedScoresQuery.in('criterion_id', criterionIds);
    }
    const { data: updatedSubmittedScores } = await updatedScoresQuery
      .order('submitted_at', { ascending: false });
    setSubmittedScores((updatedSubmittedScores || []) as unknown as JudgedEventScore[]);
  }

  const getStatusBadgeVariant = (status: ScoreStatus) => {
    switch (status) {
      case 'approved': return 'default';
      case 'rejected': return 'destructive';
      case 'pending': return 'secondary';
      default: return 'outline';
    }
  };

  if (authProfile === undefined || authProfile?.app_role !== 'admin') {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
          <p className="text-gray-600 font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
          <p className="text-gray-600 font-medium">Loading design event data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-6 animate-fade-in min-h-screen">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 tracking-tight flex items-center gap-3">
          <Award className="w-8 h-8 sm:w-10 sm:h-10 text-primary" />
          Engineering Design Event Scoring
        </h1>
        <p className="text-gray-600 max-w-2xl">
          Score teams across all design criteria. Admins and overall judges can approve entire design slots at once.
        </p>
      </div>

      {/* Error Alert */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 text-red-700">
              <AlertCircle className="w-5 h-5" />
              <div>
                <p className="font-semibold">Error</p>
                <p className="text-sm text-red-600">{error}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Scoring Form */}
        {canScore && (
          <Card className="lg:col-span-2 shadow-lg border-gray-200">
            <CardHeader className="bg-gradient-to-r from-primary/5 to-primary/10 border-b border-gray-200">
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Design Event Scoring
              </CardTitle>
              <CardDescription>
                Score your assigned teams criterion-by-criterion with comments
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="bookingId" className="text-base font-semibold flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    Select Team Booking
                  </Label>
                  <Select onValueChange={(value) => setValue('bookingId', value)} value={selectedBookingId}>
                    <SelectTrigger className="h-11">
                      <SelectValue placeholder="Select a team booking..." />
                    </SelectTrigger>
                    <SelectContent>
                      {bookings.map((booking) => (
                        <SelectItem key={booking.id} value={booking.id}>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">{booking.teams?.code}</Badge>
                            <span>{booking.teams?.name}</span>
                            {booking.scheduled_time && (
                              <span className="text-xs text-gray-500 ml-2">
                                ({new Date(booking.scheduled_time).toLocaleString()})
                              </span>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.bookingId && (
                    <p className="text-sm text-red-600 flex items-center gap-1">
                      <AlertCircle className="w-4 h-4" />
                      {errors.bookingId.message}
                    </p>
                  )}
                </div>

                {selectedBookingId && criteria.length > 0 ? (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {criteria.map((criterion, index) => (
                        <Card key={criterion.id} className="border-gray-200 shadow-sm">
                          <CardContent className="pt-6">
                            <div className="space-y-3">
                              <div className="flex items-center justify-between">
                                <Label htmlFor={`scores.${index}.score`} className="text-base font-semibold">
                                  {criterion.title}
                                </Label>
                                <Badge variant="outline" className="text-xs">
                                  Max: {criterion.max_score}
                                </Badge>
                              </div>
                              <Input 
                                id={`scores.${index}.score`} 
                                type="number" 
                                min={0} 
                                max={criterion.max_score}
                                placeholder="0" 
                                className="h-11 text-base"
                                {...register(`scores.${index}.score`, { valueAsNumber: true })} 
                              />
                              {errors.scores?.[index]?.score && (
                                <p className="text-sm text-red-600 flex items-center gap-1">
                                  <AlertCircle className="w-4 h-4" />
                                  {errors.scores[index]?.score?.message}
                                </p>
                              )}
                              <div className="space-y-2">
                                <Label htmlFor={`scores.${index}.comment`} className="text-sm flex items-center gap-2">
                                  <MessageSquare className="w-4 h-4" />
                                  Comment
                                </Label>
                                <Textarea 
                                  id={`scores.${index}.comment`} 
                                  placeholder="Provide feedback..." 
                                  className="min-h-[80px]"
                                  {...register(`scores.${index}.comment`)} 
                                />
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                    
                    <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-primary/10">
                      <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-gray-600 font-medium">Total Score</p>
                            <p className="text-3xl font-bold text-primary">
                              {totalScore} / {criteria.reduce((sum, c) => sum + c.max_score, 0)}
                            </p>
                          </div>
                          <TrendingUp className="w-12 h-12 text-primary/30" />
                        </div>
                      </CardContent>
                    </Card>

                    <Button 
                      type="submit" 
                      className="w-full h-12 text-base font-semibold bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary" 
                      disabled={isSaving || !isDirty}
                    >
                      {isSaving ? (
                        <>
                          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                          Saving Scores...
                        </>
                      ) : (
                        <>
                          <Save className="mr-2 h-5 w-5" />
                          Save Scores
                        </>
                      )}
                    </Button>
                  </>
                ) : (
                  <Card className="border-gray-200">
                    <CardContent className="pt-6">
                      <div className="text-center py-12">
                        <FileText className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                        <p className="text-gray-500 font-medium">Please select a booking to begin scoring</p>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </form>
            </CardContent>
          </Card>
        )}

        {/* Admin/Overall Judge: All Scores with Bulk Approval */}
        {canEditAll && (
          <Card className="lg:col-span-1 shadow-lg border-gray-200">
            <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-200">
              <CardTitle className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5" />
                All Submitted Scores
              </CardTitle>
              <CardDescription>
                Approve or reject entire design slots at once
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              {Object.keys(scoresByBooking).length === 0 ? (
                <div className="text-center py-8">
                  <Award className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p className="text-gray-500 font-medium">No scores submitted yet</p>
                </div>
              ) : (
                Object.entries(scoresByBooking).map(([bookingId, scores]) => {
                  const booking = bookings.find(b => b.id === bookingId);
                  const team = booking?.teams;
                  const allApproved = scores.every(s => s.status === 'approved');
                  const allRejected = scores.every(s => s.status === 'rejected');
                  const hasPending = scores.some(s => s.status === 'pending');
                  const totalScore = scores.reduce((sum, s) => sum + (s.score || 0), 0);
                  const maxScore = criteria.reduce((sum, c) => sum + c.max_score, 0);
                  
                  return (
                    <Card key={bookingId} className="border-gray-200 shadow-sm">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant="outline" className="font-bold">
                                {team?.code || 'Unknown'}
                              </Badge>
                              <span className="font-semibold text-sm">{team?.name || 'Unknown Team'}</span>
                            </div>
                            <div className="flex items-center gap-4 mt-2 text-xs text-gray-600">
                              <div className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {scores.length} categories
                              </div>
                              <div className="flex items-center gap-1">
                                <TrendingUp className="w-3 h-3" />
                                {totalScore}/{maxScore} pts
                              </div>
                            </div>
                          </div>
                          <Badge 
                            variant={allApproved ? 'default' : allRejected ? 'destructive' : 'secondary'}
                            className="text-xs"
                          >
                            {allApproved ? 'Approved' : allRejected ? 'Rejected' : 'Pending'}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0 space-y-3">
                        {/* Bulk Approval Buttons */}
                        <div className="grid grid-cols-2 gap-2">
                          <Button
                            size="sm"
                            variant="default"
                            onClick={() => handleApproveAll(bookingId)}
                            disabled={allApproved || approvingBookingId === bookingId}
                            className="gap-2 text-xs"
                          >
                            {approvingBookingId === bookingId ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <CheckCircle2 className="w-3 h-3" />
                            )}
                            Approve All
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleRejectAll(bookingId)}
                            disabled={allRejected || approvingBookingId === bookingId}
                            className="gap-2 text-xs"
                          >
                            {approvingBookingId === bookingId ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <XCircle className="w-3 h-3" />
                            )}
                            Reject All
                          </Button>
                        </div>

                        {/* Individual Scores */}
                        <div className="space-y-2 pt-2 border-t border-gray-200">
                          {scores.map(scoreEntry => {
                            const criterion = criteria.find(c => c.id === scoreEntry.criterion_id);
                            return (
                              <div key={scoreEntry.id} className="p-2 bg-gray-50 rounded text-xs">
                                <div className="flex items-center justify-between mb-1">
                                  <span className="font-medium text-gray-700">
                                    {criterion?.title || 'Unknown'}
                                  </span>
                                  <Badge variant={getStatusBadgeVariant(scoreEntry.status)} className="text-xs">
                                    {scoreEntry.status?.toUpperCase()}
                                  </Badge>
                                </div>
                                <div className="flex items-center justify-between">
                                  <span className="text-gray-600">
                                    Score: <span className="font-bold">{scoreEntry.score ?? '-'}</span>
                                  </span>
                                  {scoreEntry.comment && (
                                    <span title={scoreEntry.comment}>
                                      <MessageSquare className="w-3 h-3 text-gray-400" />
                                    </span>
                                  )}
                                </div>
                                {scoreEntry.user_profiles && (
                                  <div className="text-xs text-gray-500 mt-1">
                                    Judge: {scoreEntry.user_profiles.first_name} {scoreEntry.user_profiles.last_name}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </CardContent>
          </Card>
        )}

        {/* Team Leaders/Viewers: Readonly View */}
        {canViewOnly && (
          <Card className="lg:col-span-1 shadow-lg border-gray-200">
            <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 border-b border-gray-200">
              <CardTitle className="flex items-center gap-2">
                <Award className="w-5 h-5" />
                Team Scores & Feedback
              </CardTitle>
              <CardDescription>
                View scores and comments for your team
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              {submittedScores.length === 0 ? (
                <div className="text-center py-8">
                  <Award className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p className="text-gray-500 font-medium">No scores submitted yet</p>
                </div>
              ) : (
                submittedScores.map(scoreEntry => (
                  <Card key={scoreEntry.id} className="border-gray-200 shadow-sm">
                    <CardContent className="pt-4">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Badge variant="outline" className="font-bold">
                            {scoreEntry.judged_event_bookings?.teams?.code}
                          </Badge>
                          <Badge variant={getStatusBadgeVariant(scoreEntry.status)}>
                            {scoreEntry.status?.toUpperCase()}
                          </Badge>
                        </div>
                        <div className="text-sm">
                          <span className="text-gray-600">Score: </span>
                          <span className="font-bold text-lg">{scoreEntry.score ?? '-'}</span>
                        </div>
                        {scoreEntry.comment && (
                          <div className="text-sm text-gray-700 italic bg-gray-50 p-2 rounded">
                            <MessageSquare className="w-3 h-3 inline mr-1" />
                            {scoreEntry.comment}
                          </div>
                        )}
                        {scoreEntry.user_profiles && (
                          <div className="text-xs text-gray-500">
                            Judge: {scoreEntry.user_profiles.first_name} {scoreEntry.user_profiles.last_name}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
