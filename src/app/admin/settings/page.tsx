'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/hooks/useAuth'
import { useRouter } from 'next/navigation'
import { Webhook, ShieldAlert, CheckCircle2, XCircle, AlertCircle } from 'lucide-react'
import toast from 'react-hot-toast'

export default function IntegrationsSettingsPage() {
  const { user, profile } = useAuth()
  const router = useRouter()
  const [testing, setTesting] = useState(false)
  
  useEffect(() => {
    if (profile && profile.app_role !== 'admin') {
      router.push('/dashboard')
    }
  }, [profile, router])

  const handleTestWebhook = async () => {
    setTesting(true)
    try {
      const response = await fetch('/api/discord/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'penalty',
          title: '🔧 TEST WEBHOOK',
          description: 'This is a test message from the Integrations dashboard to verify connectivity.',
          color: 3447003,
          fields: [
            { name: 'Status', value: 'Connected', inline: true },
            { name: 'Timestamp', value: new Date().toLocaleTimeString(), inline: true }
          ]
        })
      })

      if (response.ok) {
        toast.success('Test message sent successfully!')
      } else {
        throw new Error('Server returned an error')
      }
    } catch (err) {
      toast.error('Failed to send test message. Check the URL and try again.')
    } finally {
      setTesting(false)
    }
  }

  if (!profile || profile.app_role !== 'admin') return null

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-6xl mx-auto space-y-6 bg-slate-50/50 min-h-screen animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-indigo-100 flex items-center justify-center shrink-0">
          <Webhook className="w-6 h-6 text-indigo-600" />
        </div>
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight leading-none mb-1">
            System <span className="bg-gradient-to-r from-indigo-500 to-cyan-500 bg-clip-text text-transparent">Configurations</span>
          </h1>
          <p className="text-gray-400 font-bold uppercase text-[9px] tracking-[0.3em] leading-none">
            Operational Parameters & Infrastructure Oversight
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Discord Webhook Config */}
        <Card className="shadow-lg border-gray-200">
          <CardHeader className="bg-gradient-to-r from-indigo-50 to-blue-50 border-b border-gray-200">
            <CardTitle className="flex items-center gap-2">
              <Webhook className="w-5 h-5" />
              Discord Uplink
            </CardTitle>
            <CardDescription>
              Broadcast safety incidents and penalties in real-time
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg text-sm text-emerald-800 space-y-2">
              <p className="font-semibold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" /> Webhook Configured
              </p>
              <p>
                The <code>DISCORD_WEBHOOK_URL</code> is set in your <code>.env.local</code>. All notifications are active.
              </p>
            </div>
            
            <div className="space-y-3">
              <label className="text-sm font-semibold text-gray-700">Active Notification Types</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg border border-gray-100">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                  <span>⏰ Inspection reminders (15 min before)</span>
                </div>
                <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg border border-gray-100">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                  <span>🟢 Inspection started</span>
                </div>
                <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg border border-gray-100">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                  <span>✅ Inspection passed / ❌ failed</span>
                </div>
                <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg border border-gray-100">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                  <span>🔄 Inspection reset (re-inspect)</span>
                </div>
                <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg border border-gray-100">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                  <span>⚠️ Track penalties &amp; 🚨 safety</span>
                </div>
                <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg border border-gray-100">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                  <span>🏁 New runs recorded</span>
                </div>
                <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg border border-gray-100">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                  <span>🔄 Scoring recalculated</span>
                </div>
                <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg border border-gray-100">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                  <span>⚖️ Penalties batch-applied</span>
                </div>
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <label className="text-sm font-semibold text-gray-700">Send Test Notification</label>
              <div className="flex gap-2">
                <Button onClick={handleTestWebhook} disabled={testing} className="bg-indigo-600 hover:bg-indigo-700 flex-1 sm:flex-none">
                  {testing ? 'Sending...' : '🔔 Send Test to Discord'}
                </Button>
              </div>
              <p className="text-xs text-gray-500">Sends a test embed to the configured webhook to verify connectivity.</p>
            </div>
          </CardContent>
        </Card>

        {/* Safety Dashboard Info */}
        <Card className="shadow-lg border-gray-200">
          <CardHeader className="bg-gradient-to-r from-red-50 to-orange-50 border-b border-gray-200">
            <CardTitle className="flex items-center gap-2">
              <ShieldAlert className="w-5 h-5" />
              Safety Protocols
            </CardTitle>
            <CardDescription>
              Access points for medical and safety response
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            <p className="text-sm text-gray-600">
              The Real-Time Safety Dashboard provides a live, auto-updating view of track incidents specifically designed for Emergency Medical Services (EMS) and Race Control.
            </p>
            
            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-semibold text-gray-900">Live Dashboard URL</p>
                  <code className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded mt-1 inline-block">/track/safety</code>
                </div>
                <Button variant="outline" onClick={() => router.push('/track/safety')} className="text-red-600 border-red-200 hover:bg-red-50">
                  Open Dashboard
                </Button>
              </div>
            </div>

            <ul className="text-sm space-y-2 text-gray-600">
              <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-green-500"/> Flashes red on CRITICAL incidents</li>
              <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-green-500"/> Auto-plays audible siren alerts</li>
              <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-green-500"/> No login required for read-only wall displays</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function AlertCircleIcon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="12" x2="12" y1="8" y2="12" />
      <line x1="12" x2="12.01" y1="16" y2="16" />
    </svg>
  )
}
