'use client'
import { useEffect, useState, useMemo } from 'react'
import { useParams } from 'next/navigation'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useForm, SubmitHandler } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2, Save, CheckCircle, Edit, ThumbsUp, ThumbsDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Database, JudgedEventBooking, JudgedEventCriterion, JudgedEventScore, ScoreStatus, UserProfile } from '@/lib/types/database'

const eventId = 'c583211f-3831-4696-9ad6-5dc23bce91a8' // Business Plan Event UUID

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

export default function BusinessPlanScore() {
  const { bookingId: paramBookingId } = useParams<{ bookingId: string }>()
  const supabase = createClientComponentClient<Database>()
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null)
  const [bookings, setBookings] = useState<JudgedEventBooking[]>([])
  const [criteria, setCriteria] = useState<JudgedEventCriterion[]>([])
  const [submittedScores, setSubmittedScores] = useState<JudgedEventScore[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
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
    async function loadInitialData() {
      setIsLoading(true);
      setError(null);
      try {
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError) throw userError;
        const { data: profileData, error: profileError } = await supabase
          .from('user_profiles')
          .select('id, app_role, first_name, last_name')
          .eq('id', user.id)
          .single()
        if (profileError) throw profileError;
        setCurrentUser(profileData as UserProfile);

        const { data: bookingsData, error: bookingsError } = await supabase
          .from('judged_event_bookings')
          .select('*, teams:team_id(id, code, name)')
          .eq('event_id', eventId)
          .order('scheduled_time');
        if (bookingsError) throw bookingsError;
        setBookings(bookingsData || []);

        const { data: criteriaData, error: criteriaError } = await supabase
          .from('judged_event_criteria')
          .select('*')
          .eq('event_id', eventId)
          .order('criterion_index');
        if (criteriaError) throw criteriaError;
        setCriteria(criteriaData || []);

        const criterionIds = criteriaData?.map(c => c.id) || [];
        let allScoresQuery = supabase
          .from('judged_event_scores')
          .select(`
            id, score, comment, judge_id, criterion_id, status, submitted_at,
            judged_event_bookings(teams:team_id(name, code)),
            user_profiles(first_name, last_name, app_role)
          `);
        if (criterionIds.length > 0) {
          allScoresQuery = allScoresQuery.in('criterion_id', criterionIds);
        }
        const { data: allScores, error: allScoresError } = await allScoresQuery
          .order('submitted_at', { ascending: false });
        if (allScoresError) throw allScoresError;
        setSubmittedScores(allScores || []);
      } catch (err) {
        console.error('Error loading initial data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load initial data.');
      } finally {
        setIsLoading(false);
      }
    }
    loadInitialData();
  }, [supabase]);

  useEffect(() => {
    if (selectedBookingId && criteria.length > 0 && currentUser) {
      setError(null);
      async function loadScoresForBooking() {
        const { data: existingScores, error: scoresError } = await supabase
          .from('judged_event_scores')
          .select('*')
          .eq('booking_id', selectedBookingId)
          .eq('judge_id', currentUser.id);

        if (scoresError) throw scoresError;

        const initialScores = criteria.map(criterion => {
          const existing = existingScores?.find(s => s.criterion_id === criterion.id);
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

  // === Role Logic ===
  const role = currentUser?.app_role;
  const judgeRoles = ['bp_judge'];
  const canScore = judgeRoles.includes(role) || role === 'admin';
  const canEditAll = role === 'admin' || role === 'bp_judge';
  const canViewOnly = role === 'team_leader' || role === 'viewer';

  // === Score Save handler ===
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
        .upsert(payload, { onConflict: 'booking_id,criterion_id,judge_id' });
      if (upsertError) throw upsertError;

      setSuccessMessage('Scores saved successfully!');
      await refreshScoresPanel();
      reset(data);
    } catch (err) {
      console.error('Error saving scores:', err);
      setError(err instanceof Error ? err.message : 'Failed to save scores.');
    } finally {
      setIsSaving(false);
    }
  };

  // === Approve, Reject, Edit handlers ===
  async function handleApprove(id: string) {
    await supabase.from('judged_event_scores').update({ status: 'approved' }).eq('id', id)
    refreshScoresPanel()
  }
  async function handleReject(id: string) {
    await supabase.from('judged_event_scores').update({ status: 'rejected' }).eq('id', id)
    refreshScoresPanel()
  }
  function handleEdit(score: JudgedEventScore) {
    setEditingScore(score)
    setEditValue(score.score)
  }
  async function handleSaveEdit() {
    if (editingScore && editValue != null) {
      await supabase.from('judged_event_scores').update({ score: editValue }).eq('id', editingScore.id)
      setEditingScore(null)
      setEditValue(null)
      refreshScoresPanel()
    }
  }
  async function refreshScoresPanel() {
    const criterionIds = criteria?.map(c => c.id) || [];
    let updatedScoresQuery = supabase.from('judged_event_scores')
      .select(`id, score, comment, judge_id, criterion_id, status, submitted_at, judged_event_bookings(teams:team_id(name)), user_profiles(first_name, last_name, app_role)`);
    if (criterionIds.length > 0) {
      updatedScoresQuery = updatedScoresQuery.in('criterion_id', criterionIds);
    }
    const { data: updatedSubmittedScores } = await updatedScoresQuery
      .order('submitted_at', { ascending: false });
    setSubmittedScores(updatedSubmittedScores || []);
  }

  const getStatusBadgeVariant = (status: ScoreStatus) => {
    switch (status) {
      case 'approved': return 'default';
      case 'rejected': return 'destructive';
      case 'pending': return 'secondary';
      default: return 'outline';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading event data...</span>
      </div>
    );
  }

  return (
    <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
      {canScore && (
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">Business Plan Event Scoring</CardTitle>
            <CardDescription>Admins & BP Judges: Score your assigned teams, criterion-by-criterion (with comments).</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {error && (<Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>)}
              {successMessage && (<Alert variant="default" className="bg-green-100 border-green-500 text-green-800"><CheckCircle className="h-4 w-4" /><AlertDescription>{successMessage}</AlertDescription></Alert>)}
              <div className="space-y-2">
                <Label htmlFor="bookingId">Select a team booking:</Label>
                <Select onValueChange={(value) => setValue('bookingId', value)} value={selectedBookingId}>
                  <SelectTrigger><SelectValue placeholder="Select Booking" /></SelectTrigger>
                  <SelectContent>
                    {bookings.map((booking) => (
                      <SelectItem key={booking.id} value={booking.id}>
                        {booking.teams?.code} - {booking.teams?.name} ({new Date(booking.scheduled_time!).toLocaleString()})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.bookingId && (<p className="text-sm text-red-600">{errors.bookingId.message}</p>)}
              </div>
              {selectedBookingId && criteria.length > 0 ? (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {criteria.map((criterion, index) => (
                      <div key={criterion.id} className="space-y-2 border-b pb-2 mb-2">
                        <Label htmlFor={`scores.${index}.score`}>{criterion.title} (Max: {criterion.max_score})</Label>
                        <Input id={`scores.${index}.score`} type="number" min={0} max={criterion.max_score}
                          placeholder="0" {...register(`scores.${index}.score`, { valueAsNumber: true })} />
                        {errors.scores?.[index]?.score && (
                          <p className="text-sm text-red-600">{errors.scores[index]?.score?.message}</p>
                        )}
                        <Label htmlFor={`scores.${index}.comment`}>Comment</Label>
                        <Textarea id={`scores.${index}.comment`} placeholder="Provide feedback..."
                          {...register(`scores.${index}.comment`)} />
                        {errors.scores?.[index]?.comment && (
                          <p className="text-sm text-red-600">{errors.scores[index]?.comment?.message}</p>
                        )}
                      </div>
                    ))}
                  </div>
                  <div className="text-2xl font-bold text-center py-4 border-t border-b">
                    Total Score: {totalScore} / {criteria.reduce((sum, c) => sum + c.max_score, 0)}
                  </div>
                  <Button type="submit" className="w-full" disabled={isSaving || !isDirty}>
                    {isSaving ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving Scores...</>) : (<><Save className="mr-2 h-4 w-4" />Save Score</>)}
                  </Button>
                </>
              ) : (<p className="text-center text-muted-foreground">Please select a booking to begin scoring.</p>)}
            </form>
          </CardContent>
        </Card>
      )}
      {/* Admins & BP Judges: All Scores, Approve/Edit */}
      {canEditAll && (
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>All Submitted Scores</CardTitle>
            <CardDescription>Admins & BP Judges: Edit, Approve, Reject</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {submittedScores.length === 0 ? (<p className="text-center text-muted-foreground">No scores yet.</p>)
              : submittedScores.map(scoreEntry => (
                  <div key={scoreEntry.id} className="border rounded-lg p-3 flex items-center justify-between">
                    <div>
                      <div className="font-semibold">{scoreEntry.judged_event_bookings?.teams?.name}</div>
                      <div className="text-xs text-muted-foreground">
                        Judge: {scoreEntry.user_profiles?.first_name} {scoreEntry.user_profiles?.last_name}
                      </div>
                      <div>
                        Score: {editingScore?.id === scoreEntry.id ? (
                          <Input type="number" value={editValue ?? scoreEntry.score ?? ''} onChange={e => setEditValue(Number(e.target.value))} className="w-20" />
                        ) : (<span className="font-bold">{scoreEntry.score ?? '-'}</span>)}
                      </div>
                      {scoreEntry.comment && (<div className="mt-1 text-sm text-gray-700 italic">Comment: {scoreEntry.comment}</div>)}
                    </div>
                    <div className="flex flex-col items-center gap-1">
                      <Badge variant={getStatusBadgeVariant(scoreEntry.status)}>{scoreEntry.status?.toUpperCase()}</Badge>
                      <Button size="xs" variant="default" onClick={() => handleApprove(scoreEntry.id)} disabled={scoreEntry.status === 'approved'}><ThumbsUp size={14}/> Approve</Button>
                      <Button size="xs" variant="destructive" onClick={() => handleReject(scoreEntry.id)} disabled={scoreEntry.status === 'rejected'}><ThumbsDown size={14}/> Reject</Button>
                      <Button size="xs" variant="secondary" onClick={() => handleEdit(scoreEntry)}><Edit size={14}/> Edit</Button>
                      {editingScore?.id === scoreEntry.id && (
                        <Button size="xs" variant="default" onClick={handleSaveEdit}>Save</Button>
                      )}
                    </div>
                  </div>
                ))
            }
          </CardContent>
        </Card>
      )}
      {/* Team Leaders/Viewers: Readonly View */}
      {canViewOnly && (
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Team Scores & Feedback</CardTitle>
            <CardDescription>View scores/comments for your team.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {submittedScores.length === 0 ? (<p className="text-center text-muted-foreground">No scores submitted yet.</p>)
              : submittedScores.map(scoreEntry => (
                  <div key={scoreEntry.id} className="border rounded-lg p-3">
                    <div className="font-semibold">{scoreEntry.judged_event_bookings?.teams?.name}</div>
                    <div className="text-xs text-muted-foreground">
                      Judge: {scoreEntry.user_profiles?.first_name} {scoreEntry.user_profiles?.last_name}
                    </div>
                    <div>Score: <span className="font-bold">{scoreEntry.score ?? '-'}</span></div>
                    {scoreEntry.comment && (
                      <div className="mt-1 text-sm text-gray-700 italic">
                        Comment: {scoreEntry.comment}
                      </div>
                    )}
                    <Badge variant={getStatusBadgeVariant(scoreEntry.status)}>{scoreEntry.status?.toUpperCase()}</Badge>
                  </div>
                ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
