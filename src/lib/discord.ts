/**
 * Discord Webhook Notification System
 * Centralized utility for sending rich embed notifications to Discord.
 *
 * Covers:
 *   - Inspection reminders (15 min before)
 *   - Inspection started / passed / failed / suspended
 *   - Track penalties & safety incidents (already wired in marshal page)
 *   - Live track data updates (new run recorded)
 *   - Final results published
 *   - General announcements, deadlines, & document uploads
 */

import { logger } from '@/lib/utils/logger'

// ── Brand colours (Discord colour integers) ───────────────────────
const COLORS = {
  primary:     3447003,   // #3498DB — blue
  success:     3066993,   // #2ECC71 — green
  warning:     16776960,  // #FFFF00 — yellow
  danger:      15158332,  // #E74C3C — red
  orange:      16753920,  // #FF8C00 — orange
  purple:      10181046,  // #9B59B6 — purple
  gold:        16766720,  // #FFD700 — gold
  slate:       7506394,   // #727D8A — slate
  info:        1752220,   // #1ABC9C — teal
} as const

// ── Types ─────────────────────────────────────────────────────────
export type DiscordEmbedField = {
  name: string
  value: string
  inline?: boolean
}

export type DiscordEmbed = {
  title: string
  description?: string
  color?: number
  fields?: DiscordEmbedField[]
  footer?: { text: string; icon_url?: string }
  timestamp?: string
  thumbnail?: { url: string }
  url?: string
}

type SendOptions = {
  content?: string        // plain text above the embed (used for @mentions)
  embeds?: DiscordEmbed[]
  username?: string
  avatar_url?: string
}

// ── Core sender ───────────────────────────────────────────────────
async function getWebhookUrl(): Promise<string | null> {
  // Server-side: use env directly
  if (typeof process !== 'undefined' && process.env?.DISCORD_WEBHOOK_URL) {
    return process.env.DISCORD_WEBHOOK_URL
  }
  return null
}

/**
 * Send a raw payload to Discord.  Works from both server (API route) and
 * from the edge / serverless context.
 */
export async function sendToDiscord(payload: SendOptions): Promise<boolean> {
  try {
    const webhookUrl = await getWebhookUrl()
    if (!webhookUrl) {
      logger.warn('[Discord] DISCORD_WEBHOOK_URL not configured — skipping notification')
      return false
    }

    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: payload.username ?? '🏁 Formula IHU Hub',
        avatar_url: payload.avatar_url,
        content: payload.content,
        embeds: payload.embeds,
      }),
    })

    if (!res.ok) {
      const text = await res.text()
      logger.error(`[Discord] Webhook returned ${res.status}: ${text}`)
      return false
    }
    return true
  } catch (err) {
    logger.error('[Discord] Failed to send notification', err)
    return false
  }
}

// ── Helper: single embed shorthand ────────────────────────────────
export async function sendEmbed(embed: DiscordEmbed, content?: string): Promise<boolean> {
  return sendToDiscord({
    content,
    embeds: [{
      ...embed,
      footer: embed.footer ?? { text: 'Formula IHU Hub • Live Operations' },
      timestamp: embed.timestamp ?? new Date().toISOString(),
    }],
  })
}

// ══════════════════════════════════════════════════════════════════
//  HIGH-LEVEL NOTIFICATION FUNCTIONS
// ══════════════════════════════════════════════════════════════════

// ── 1. INSPECTION REMINDER (15 min before) ────────────────────────
export async function notifyInspectionReminder(data: {
  teamName: string
  teamCode: string
  inspectionType: string
  startTime: string
  date: string
  vehicleClass?: string
}) {
  return sendEmbed({
    title: '⏰ Inspection Starting in 15 Minutes',
    description: `**${data.teamName}** should prepare for their **${data.inspectionType}** session.`,
    color: COLORS.warning,
    fields: [
      { name: '🏎️ Team', value: `${data.teamName} (#${data.teamCode})`, inline: true },
      { name: '🔧 Inspection', value: data.inspectionType, inline: true },
      { name: '🕐 Time', value: data.startTime, inline: true },
      { name: '📅 Date', value: data.date, inline: true },
      ...(data.vehicleClass ? [{ name: '🏷️ Class', value: data.vehicleClass, inline: true }] : []),
    ],
  })
}

// ── 2. INSPECTION STARTED ─────────────────────────────────────────
export async function notifyInspectionStarted(data: {
  teamName: string
  teamCode: string
  inspectionType: string
  scrutineerName?: string
}) {
  return sendEmbed({
    title: '🟢 Inspection Started',
    description: `**${data.inspectionType}** for **${data.teamName}** (#${data.teamCode}) is now in progress.`,
    color: COLORS.primary,
    fields: [
      { name: '🏎️ Team', value: `${data.teamName} (#${data.teamCode})`, inline: true },
      { name: '🔧 Type', value: data.inspectionType, inline: true },
      ...(data.scrutineerName ? [{ name: '👤 Scrutineer', value: data.scrutineerName, inline: true }] : []),
    ],
  })
}

// ── 3. INSPECTION PASSED ──────────────────────────────────────────
export async function notifyInspectionPassed(data: {
  teamName: string
  teamCode: string
  inspectionType: string
  vehicleClass?: string
}) {
  return sendEmbed({
    title: '✅ Inspection PASSED',
    description: `**${data.teamName}** (#${data.teamCode}) has **passed** their **${data.inspectionType}**! 🎉`,
    color: COLORS.success,
    fields: [
      { name: '🏎️ Team', value: `${data.teamName} (#${data.teamCode})`, inline: true },
      { name: '🔧 Type', value: data.inspectionType, inline: true },
      { name: '📋 Result', value: '✅ PASSED', inline: true },
      ...(data.vehicleClass ? [{ name: '🏷️ Class', value: data.vehicleClass, inline: true }] : []),
    ],
  })
}

// ── 4. INSPECTION FAILED ──────────────────────────────────────────
export async function notifyInspectionFailed(data: {
  teamName: string
  teamCode: string
  inspectionType: string
  vehicleClass?: string
  reason?: string
}) {
  return sendEmbed({
    title: '❌ Inspection FAILED',
    description: `**${data.teamName}** (#${data.teamCode}) has **failed** their **${data.inspectionType}**.`,
    color: COLORS.danger,
    fields: [
      { name: '🏎️ Team', value: `${data.teamName} (#${data.teamCode})`, inline: true },
      { name: '🔧 Type', value: data.inspectionType, inline: true },
      { name: '📋 Result', value: '❌ FAILED', inline: true },
      ...(data.vehicleClass ? [{ name: '🏷️ Class', value: data.vehicleClass, inline: true }] : []),
      ...(data.reason ? [{ name: '📝 Notes', value: data.reason }] : []),
    ],
  })
}

// ── 5. TRACK PENALTY ──────────────────────────────────────────────
export async function notifyTrackPenalty(data: {
  teamCode: string
  event: string
  sector: string
  runNumber: number
  cones?: number
  offCourse?: number
  dsq?: boolean
}) {
  const penaltyDetails: string[] = []
  if (data.cones && data.cones > 0) penaltyDetails.push(`${data.cones} cone${data.cones > 1 ? 's' : ''}`)
  if (data.offCourse && data.offCourse > 0) penaltyDetails.push(`${data.offCourse} off-course`)
  if (data.dsq) penaltyDetails.push('**DSQ**')

  return sendEmbed({
    title: data.dsq ? '🚫 DISQUALIFICATION' : '⚠️ Track Penalty Issued',
    description: `Penalty applied to **Team #${data.teamCode}** during **${data.event}**.`,
    color: data.dsq ? COLORS.danger : COLORS.orange,
    fields: [
      { name: '🏎️ Team', value: `#${data.teamCode}`, inline: true },
      { name: '🏁 Event', value: data.event, inline: true },
      { name: '📍 Sector', value: data.sector, inline: true },
      { name: '#️⃣ Run', value: `#${data.runNumber}`, inline: true },
      { name: '⚠️ Penalties', value: penaltyDetails.join(', ') || 'None', inline: false },
    ],
  })
}

// ── 6. SAFETY INCIDENT ────────────────────────────────────────────
export async function notifySafetyIncident(data: {
  teamCode: string
  event: string
  sector: string
  severity: 'minor' | 'critical'
  description?: string
}) {
  return sendEmbed({
    title: data.severity === 'critical' ? '🚨 CRITICAL SAFETY INCIDENT' : '⚠️ Safety Concern Reported',
    description: data.description || `A ${data.severity} safety concern has been flagged.`,
    color: data.severity === 'critical' ? COLORS.danger : COLORS.orange,
    fields: [
      { name: '🏎️ Team', value: `#${data.teamCode}`, inline: true },
      { name: '🏁 Event', value: data.event, inline: true },
      { name: '📍 Sector', value: data.sector, inline: true },
      { name: '🔴 Severity', value: data.severity.toUpperCase(), inline: true },
    ],
  }, data.severity === 'critical' ? '🚨 **CRITICAL SAFETY ALERT** — Immediate attention required!' : undefined)
}

// ── 7. NEW RUN RECORDED (Live Track Data) ─────────────────────────
export async function notifyNewRun(data: {
  teamCode: string
  teamName: string
  event: string
  runNumber: number
  rawTime: number | null
  status: string
  vehicleClass?: string
}) {
  const timeStr = data.rawTime ? `${data.rawTime.toFixed(3)}s` : 'N/A'
  const statusEmoji = data.status === 'completed' ? '🏁' : data.status === 'dnf' ? '⚫' : data.status === 'dsq' ? '🚫' : '⏸️'

  return sendEmbed({
    title: `${statusEmoji} Run Recorded — ${data.event}`,
    description: `**${data.teamName}** (#${data.teamCode}) completed Run #${data.runNumber}.`,
    color: data.status === 'completed' ? COLORS.info : data.status === 'dsq' ? COLORS.danger : COLORS.slate,
    fields: [
      { name: '🏎️ Team', value: `${data.teamName} (#${data.teamCode})`, inline: true },
      { name: '🏁 Event', value: data.event, inline: true },
      { name: '#️⃣ Run', value: `#${data.runNumber}`, inline: true },
      { name: '⏱️ Raw Time', value: timeStr, inline: true },
      { name: '📊 Status', value: data.status.toUpperCase(), inline: true },
      ...(data.vehicleClass ? [{ name: '🏷️ Class', value: data.vehicleClass, inline: true }] : []),
    ],
  })
}

// ── 8. RESULTS PUBLISHED ──────────────────────────────────────────
export async function notifyResultsPublished(data: {
  eventName: string
  vehicleClass: string
  topThree?: { rank: number; teamCode: string; teamName: string; points: number }[]
}) {
  const podiumFields: DiscordEmbedField[] = (data.topThree ?? []).map(t => ({
    name: `${t.rank === 1 ? '🥇' : t.rank === 2 ? '🥈' : '🥉'} ${t.rank}${t.rank === 1 ? 'st' : t.rank === 2 ? 'nd' : 'rd'} Place`,
    value: `**${t.teamName}** (#${t.teamCode}) — ${t.points.toFixed(2)} pts`,
    inline: false,
  }))

  return sendEmbed({
    title: `🏆 Results Published — ${data.eventName} (${data.vehicleClass})`,
    description: `Official results for **${data.eventName}** in the **${data.vehicleClass}** class are now available!`,
    color: COLORS.gold,
    fields: [
      { name: '🏁 Event', value: data.eventName, inline: true },
      { name: '🏷️ Class', value: data.vehicleClass, inline: true },
      ...podiumFields,
    ],
  })
}

// ── 9. PENALTY RULE APPLIED ───────────────────────────────────────
export async function notifyPenaltiesApplied(data: {
  appliedCount: number
  eventType?: string
}) {
  return sendEmbed({
    title: '⚖️ Penalties Applied to Runs',
    description: `**${data.appliedCount}** run(s) have been updated with corrected times based on penalty rules.`,
    color: COLORS.orange,
    fields: [
      { name: '📊 Runs Updated', value: data.appliedCount.toString(), inline: true },
      ...(data.eventType ? [{ name: '🏁 Event', value: data.eventType, inline: true }] : []),
    ],
  })
}

// ── 10. GENERAL ANNOUNCEMENT ──────────────────────────────────────
export async function notifyAnnouncement(data: {
  title: string
  message: string
  type?: 'info' | 'warning' | 'urgent'
}) {
  const colorMap = {
    info: COLORS.primary,
    warning: COLORS.orange,
    urgent: COLORS.danger,
  }
  const emojiMap = {
    info: '📢',
    warning: '⚠️',
    urgent: '🚨',
  }
  const t = data.type ?? 'info'

  return sendEmbed({
    title: `${emojiMap[t]} ${data.title}`,
    description: data.message,
    color: colorMap[t],
  }, t === 'urgent' ? '🚨 **URGENT ANNOUNCEMENT** — Please read immediately!' : undefined)
}

// ── 11. DEADLINE / DOCUMENT REMINDER ──────────────────────────────
export async function notifyDeadline(data: {
  title: string
  deadline: string
  description?: string
  documentUrl?: string
}) {
  return sendEmbed({
    title: `📋 Deadline Reminder: ${data.title}`,
    description: data.description || `The deadline for **${data.title}** is approaching.`,
    color: COLORS.purple,
    fields: [
      { name: '⏰ Deadline', value: data.deadline, inline: true },
      ...(data.documentUrl ? [{ name: '📎 Document', value: `[Open Link](${data.documentUrl})`, inline: true }] : []),
    ],
  })
}

// ── 12. SCORING RECALCULATED ──────────────────────────────────────
export async function notifyScoringUpdated(data: {
  eventType: string
}) {
  return sendEmbed({
    title: '🔄 Scoring Recalculated',
    description: `Scoring for **${data.eventType}** has been recalculated. Check the Results page for updated standings.`,
    color: COLORS.info,
    fields: [
      { name: '🏁 Event', value: data.eventType, inline: true },
    ],
  })
}

// ── 13. INSPECTION REINSPECT / RESET ──────────────────────────────
export async function notifyInspectionReset(data: {
  teamName: string
  teamCode: string
  inspectionType: string
  resetBy?: string
}) {
  return sendEmbed({
    title: '🔄 Inspection Reset for Re-inspection',
    description: `**${data.teamName}** (#${data.teamCode}) has been reset for re-inspection of **${data.inspectionType}**.`,
    color: COLORS.orange,
    fields: [
      { name: '🏎️ Team', value: `${data.teamName} (#${data.teamCode})`, inline: true },
      { name: '🔧 Type', value: data.inspectionType, inline: true },
      ...(data.resetBy ? [{ name: '👤 Reset By', value: data.resetBy, inline: true }] : []),
    ],
  })
}
