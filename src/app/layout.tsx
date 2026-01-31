import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Providers } from './providers'
import { LayoutWrapper } from './layout-wrapper'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { SupabaseDebuggerLoader } from '@/components/SupabaseDebuggerLoader'

const inter = Inter({ 
  subsets: ['latin'],
  display: 'swap',
  preload: false,
})

export const metadata: Metadata = {
  title: 'Scrutineer Hub - Formula IHU 2026 Scrutineering Platform',
  description: 'Formula IHU 2026 – professional scrutineering platform for formula racing and EV competitions',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className} suppressHydrationWarning>
        <ErrorBoundary>
          <Providers>
            <LayoutWrapper>{children}</LayoutWrapper>
            <SupabaseDebuggerLoader />
          </Providers>
        </ErrorBoundary>
      </body>
    </html>
  )
}
