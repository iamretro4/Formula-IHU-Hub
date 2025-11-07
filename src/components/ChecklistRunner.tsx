'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useInspectionStatus } from '@/hooks/useInspectionStatus'
import { useChecklistManager } from '@/hooks/useChecklistManager'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, CheckCircle, Clock, AlertCircle, MessageSquare } from 'lucide-react'

interface ChecklistRunnerProps {
  bookingId: string
  inspectionTypeId: string
}

type User = {
  id: string
  email?: string
  app_role?: string
}

export default function ChecklistRunner({ bookingId, inspectionTypeId }: ChecklistRunnerProps) {
  const router = useRouter()
  const supabase = createClientComponentClient()
  const [user, setUser] = useState<User | null>(null)
  const [commentingItemId, setCommentingItemId] = useState<string | null>(null)
  const [commentDraft, setCommentDraft] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Use custom hooks for robust state management
  const { status, updateStatus, isUpdating: isStatusUpdating } = useInspectionStatus({ 
    bookingId 
  })
  
  const { 
    items, 
    isLoading, 
    error, 
    updateItem, 
    isUpdating, 
    completionStatus 
  } = useChecklistManager({ 
    bookingId, 
    inspectionTypeId 
  })

  // Load user on mount
  useEffect(() => {
    const loadUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
    }
    loadUser()
  }, [supabase])

  // Auto-transition to ongoing status when component loads
  useEffect(() => {
    if (status === 'upcoming' && !isStatusUpdating) {
      updateStatus('ongoing')
    }
  }, [status, updateStatus, isStatusUpdating])

  // Group items by section
  const itemsBySection = items.reduce((acc, item) => {
    if (!acc[item.section]) {
      acc[item.section] = []
    }
    acc[item.section].push(item)
    return acc
  }, {} as Record<string, typeof items>)

  // Handle checkbox change
  const handleItemCheck = async (itemId: string, checked: boolean) => {
    await updateItem(itemId, checked)
  }

  // Handle comment modal
  const openCommentModal = (itemId: string) => {
    const item = items.find(i => i.id === itemId)
    setCommentingItemId(itemId)
    setCommentDraft(item?.comment || '')
  }

  const saveComment = async () => {
    if (!commentingItemId) return
    
    const item = items.find(i => i.id === commentingItemId)
    await updateItem(commentingItemId, item?.isChecked || false, commentDraft)
    
    setCommentingItemId(null)
    setCommentDraft('')
  }

  // Handle final submission
  const handleSubmit = async (finalStatus: 'passed' | 'failed') => {
    if (!completionStatus.canPass && finalStatus === 'passed') {
      alert('All checklist items must be completed before marking as passed')
      return
    }

    setIsSubmitting(true)
    
    try {
      // Update booking status
      const success = await updateStatus('completed')
      
      if (success) {
        // Update inspection result
        const { error } = await supabase
          .from('inspection_results')
          .upsert([{
            booking_id: bookingId,
            status: finalStatus === 'passed' ? 'passed' : 'failed',
            completed_at: new Date().toISOString(),
            scrutineer_ids: user ? [user.id] : []
          }])

        if (error) throw error

        // Redirect back to live queue
        router.push('/scrutineering/live')
      }
    } catch (err) {
      console.error('Failed to submit inspection:', err)
      alert('Failed to submit inspection. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading checklist...</span>
      </div>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Failed to load checklist: {error}
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              Inspection Checklist
              <Badge variant={status === 'ongoing' ? 'default' : 'secondary'}>
                {status?.toUpperCase()}
              </Badge>
            </CardTitle>
            <div className="text-sm text-muted-foreground">
              {completionStatus.completed} of {completionStatus.total} items completed
              ({completionStatus.percentage}%)
            </div>
          </div>
          
          {/* Progress bar */}
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${completionStatus.percentage}%` }}
            />
          </div>
        </CardHeader>
      </Card>

      {/* Checklist Items by Section */}
      {Object.entries(itemsBySection).map(([section, sectionItems]) => (
        <Card key={section}>
          <CardHeader>
            <CardTitle className="text-lg">{section}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {sectionItems.map((item) => (
              <div key={item.id} className="flex items-start space-x-3 p-4 border rounded-lg">
                <Checkbox
                  id={item.id}
                  checked={item.isChecked}
                  onCheckedChange={(checked: boolean | string) =>
                    handleItemCheck(item.id, checked as boolean)
                  }
                  disabled={isUpdating}
                  className="mt-1"
                />
                <div className="flex-1 space-y-2">
                  <label 
                    htmlFor={item.id}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                  >
                    {item.description}
                  </label>
                  
                  {/* Audit trail */}
                  {item.checkedBy && item.checkedAt && (
                    <div className="text-xs text-muted-foreground flex items-center gap-2">
                      <Clock className="h-3 w-3" />
                      Checked by {item.checkedBy} at {new Date(item.checkedAt).toLocaleString()}
                    </div>
                  )}
                  
                  {/* Comment button and display */}
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openCommentModal(item.id)}
                      className="h-8"
                    >
                      <MessageSquare className="h-3 w-3 mr-1" />
                      {item.comment ? 'Edit Comment' : 'Add Comment'}
                    </Button>
                    {item.comment && (
                      <span className="text-xs text-muted-foreground">
                        "{item.comment}"
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      ))}

      {/* Action Buttons */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex justify-between items-center">
            <div className="text-sm text-muted-foreground">
              {completionStatus.canPass ? (
                <span className="text-green-600 flex items-center gap-1">
                  <CheckCircle className="h-4 w-4" />
                  All items completed - Ready to pass
                </span>
              ) : (
                <span className="text-amber-600 flex items-center gap-1">
                  <AlertCircle className="h-4 w-4" />
                  Complete all items to enable pass option
                </span>
              )}
            </div>
            
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => router.push('/scrutineering/live')}
                disabled={isSubmitting}
              >
                Back to Queue
              </Button>
              
              <Button
                variant="destructive"
                onClick={() => handleSubmit('failed')}
                disabled={isSubmitting || isStatusUpdating}
              >
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Mark as Failed
              </Button>
              
              <Button
                onClick={() => handleSubmit('passed')}
                disabled={!completionStatus.canPass || isSubmitting || isStatusUpdating}
              >
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Mark as Passed
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Comment Modal */}
      <Dialog open={!!commentingItemId} onOpenChange={() => setCommentingItemId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Comment</DialogTitle>
          </DialogHeader>
          <Textarea
            value={commentDraft}
            onChange={(e) => setCommentDraft(e.target.value)}
            placeholder="Enter your comment or note for this checklist item..."
            rows={4}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setCommentingItemId(null)}>
              Cancel
            </Button>
            <Button onClick={saveComment} disabled={isUpdating}>
              {isUpdating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Save Comment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
