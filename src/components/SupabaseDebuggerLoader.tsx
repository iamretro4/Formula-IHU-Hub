'use client'

import dynamic from 'next/dynamic'

const SupabaseDebugger = dynamic(
  () => import('@/components/SupabaseDebugger').then((m) => m.SupabaseDebugger),
  { ssr: false }
)

export function SupabaseDebuggerLoader() {
  if (process.env.NODE_ENV !== 'development') return null
  return <SupabaseDebugger />
}
