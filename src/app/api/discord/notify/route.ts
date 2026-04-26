import { NextResponse } from 'next/server'
import { logger } from '@/lib/utils/logger'
import {
  sendEmbed,
  notifyInspectionReminder,
  notifyInspectionStarted,
  notifyInspectionPassed,
  notifyInspectionFailed,
  notifyTrackPenalty,
  notifySafetyIncident,
  notifyNewRun,
  notifyResultsPublished,
  notifyPenaltiesApplied,
  notifyAnnouncement,
  notifyDeadline,
  notifyScoringUpdated,
  notifyInspectionReset,
} from '@/lib/discord'

/**
 * POST /api/discord/notify
 *
 * Unified Discord notification endpoint.
 * Accepts a `type` field to dispatch to the correct notification function,
 * or falls back to a generic embed for backward-compat with existing callers.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { type, ...data } = body

    let success = false

    switch (type) {
      // ── Inspection lifecycle ─────────────────────────────
      case 'inspection_reminder':
        success = await notifyInspectionReminder(data)
        break
      case 'inspection_started':
        success = await notifyInspectionStarted(data)
        break
      case 'inspection_passed':
        success = await notifyInspectionPassed(data)
        break
      case 'inspection_failed':
        success = await notifyInspectionFailed(data)
        break
      case 'inspection_reset':
        success = await notifyInspectionReset(data)
        break

      // ── Track / marshal ──────────────────────────────────
      case 'track_penalty':
        success = await notifyTrackPenalty(data)
        break
      case 'safety_incident':
        success = await notifySafetyIncident(data)
        break
      case 'new_run':
        success = await notifyNewRun(data)
        break

      // ── Results / scoring ────────────────────────────────
      case 'results_published':
        success = await notifyResultsPublished(data)
        break
      case 'penalties_applied':
        success = await notifyPenaltiesApplied(data)
        break
      case 'scoring_updated':
        success = await notifyScoringUpdated(data)
        break

      // ── Announcements / deadlines ────────────────────────
      case 'announcement':
        success = await notifyAnnouncement(data)
        break
      case 'deadline':
        success = await notifyDeadline(data)
        break

      // ── Legacy / generic (backward-compat) ───────────────
      default: {
        const { title, description, color, fields } = body
        success = await sendEmbed({
          title: title || (type === 'safety' ? '🚨 SAFETY ALERT' : '⚠️ PENALTY NOTICE'),
          description: description || '',
          color: color || (type === 'safety' ? 16711680 : 16753920),
          fields: fields || [],
        })
      }
    }

    if (!success) {
      return NextResponse.json(
        { success: false, error: 'Failed to send to Discord (webhook may not be configured)' },
        { status: 500 },
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    logger.error('[Discord Notify] Error sending notification', error)
    return NextResponse.json(
      { success: false, error: 'Internal Server Error' },
      { status: 500 },
    )
  }
}
