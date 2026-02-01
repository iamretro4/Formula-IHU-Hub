'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

/**
 * /admin redirects to User Management. The former admin dashboard was removed.
 */
export default function AdminPage() {
  const router = useRouter()
  useEffect(() => {
    router.replace('/admin/users')
  }, [router])
  return null
}
