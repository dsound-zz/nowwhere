'use client'

import { useState } from 'react'
import { useAuth } from '@/components/providers/SupabaseProvider'

interface AuthModalProps {
   onClose: () => void
}

export function AuthModal({ onClose }: AuthModalProps) {
   const [email, setEmail] = useState('')
   const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
   const [errorMessage, setErrorMessage] = useState('')
   const { signIn } = useAuth()

   const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault()

      if (!email.trim()) return

      setStatus('sending')
      setErrorMessage('')

      try {
         await signIn(email.trim())
         setStatus('sent')
      } catch (error) {
         setStatus('error')
         setErrorMessage(error instanceof Error ? error.message : 'Failed to send magic link')
      }
   }

   return (
      <div
         className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm"
         onClick={onClose}
      >
         <div
            className="bg-surface border border-border rounded-[--radius] p-6 max-w-md w-full mx-4"
            onClick={(e) => e.stopPropagation()}
         >
            {status === 'sent' ? (
               // Check your email state
               <>
                  <div className="text-center mb-4">
                     <div className="text-4xl mb-3">📧</div>
                     <h2 className="font-display font-bold text-xl mb-2">Check your email</h2>
                     <p className="text-sm text-muted">
                        We sent a magic link to <span className="text-text font-medium">{email}</span>
                     </p>
                  </div>
                  <p className="text-xs text-muted text-center mb-4">
                     Click the link in the email to sign in. You can close this window.
                  </p>
                  <button
                     onClick={onClose}
                     className="w-full py-2.5 rounded-full bg-purple text-white font-semibold transition-opacity hover:opacity-90"
                  >
                     Got it
                  </button>
               </>
            ) : (
               // Email input form
               <>
                  <h2 className="font-display font-bold text-xl mb-2">Sign in to NowHere</h2>
                  <p className="text-sm text-muted mb-4">
                     {`We'll send you a magic link to sign in without a password`}
                  </p>

                  <form onSubmit={handleSubmit}>
                     <input
                        type="email"
                        placeholder="your@email.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full bg-surface2 border border-border rounded-lg px-4 py-2.5 text-sm outline-none focus:border-purple transition-colors mb-4"
                        disabled={status === 'sending'}
                        required
                        autoFocus
                     />

                     {status === 'error' && (
                        <div className="mb-4 p-3 bg-coral-dim border border-coral/20 rounded-lg text-sm text-coral">
                           {errorMessage}
                        </div>
                     )}

                     <div className="flex gap-3">
                        <button
                           type="button"
                           onClick={onClose}
                           className="flex-1 py-2.5 rounded-full bg-surface2 text-muted font-semibold transition-colors hover:bg-surface"
                           disabled={status === 'sending'}
                        >
                           Cancel
                        </button>
                        <button
                           type="submit"
                           className="flex-1 py-2.5 rounded-full bg-purple text-white font-semibold transition-opacity hover:opacity-90 disabled:opacity-50"
                           disabled={status === 'sending'}
                        >
                           {status === 'sending' ? 'Sending...' : 'Send magic link'}
                        </button>
                     </div>
                  </form>

                  <p className="text-xs text-muted text-center mt-4">
                     No account? {`We'll create one for you automatically.`}
                  </p>
               </>
            )}
         </div>
      </div>
   )
}
