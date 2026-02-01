// src/app/auth/layout.tsx
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import '../globals.css'
import { Toaster } from 'react-hot-toast'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Sign in | Formula IHU Hub',
  description: 'Authentication for Formula IHU Hub',
}

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <main className={inter.className}>
        {children}
      </main>
      <Toaster position="top-right" />
    </>
  )
}
