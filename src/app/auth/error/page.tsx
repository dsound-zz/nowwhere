'use client'

import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Sidebar } from '@/components/layout/Sidebar'

import { Suspense } from 'react'

function AuthErrorContent() {
   const searchParams = useSearchParams()
   const error = searchParams.get('error')
   const errorDescription = searchParams.get('error_description')

   return (
      <div className="flex h-screen overflow-hidden">
         <Sidebar />

         <main className="flex-1 flex items-center justify-center p-8">
            <div className="max-w-md w-full bg-surface border border-border rounded-[--radius] p-8 text-center">
               <div className="text-5xl mb-4">⚠️</div>
               <h1 className="font-display font-bold text-2xl mb-3">Authentication Error</h1>

               <p className="text-muted mb-4">
                  {errorDescription || 'Something went wrong while signing you in.'}
               </p>

               {error && (
                  <div className="bg-surface2 border border-border2 rounded-lg p-3 mb-6 text-left">
                     <p className="text-xs text-faint font-mono">{error}</p>
                  </div>
               )}

               <div className="flex flex-col gap-3">
                  <Link
                     href="/"
                     className="w-full py-2.5 rounded-full bg-purple text-white font-semibold text-center transition-opacity hover:opacity-90"
                  >
                     Go to feed
                  </Link>
                  <Link
                     href="/"
                     className="text-sm text-purple hover:underline"
                  >
                     Try signing in again
                  </Link>
               </div>

               <p className="text-xs text-muted mt-6">
                  If this problem persists, please contact support.
               </p>
            </div>
         </main>
      </div>
   )
}

export default function AuthErrorPage() {
   return (
      <Suspense fallback={<div className="flex h-screen items-center justify-center text-muted">Loading...</div>}>
         <AuthErrorContent />
      </Suspense>
   )
}
