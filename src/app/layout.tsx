import type { Metadata, Viewport } from 'next'
import { AuthProvider } from '@/components/providers/SupabaseProvider'
import './globals.css'

export const metadata: Metadata = {
  title: 'NowHere - What\'s Happening Near You',
  description: 'Discover local events happening right now within walking distance. No account needed to browse.',
  manifest: '/manifest.json',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#0a0a0b',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className="antialiased">
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  )
}
