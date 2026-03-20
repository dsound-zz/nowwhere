'use client'

import { useState, useEffect } from 'react'
import { Sidebar } from '@/components/layout/Sidebar'
import { useAuth } from '@/components/providers/SupabaseProvider'
import { AuthModal } from '@/components/auth/AuthModal'
import { Emoji } from '@/components/ui/Emoji'

const RADIUS_OPTIONS = [
   { value: 800, label: '0.5 miles (800m)' },
   { value: 1600, label: '1 mile (1600m) - Default' },
   { value: 3200, label: '2 miles (3200m)' },
]

export default function SettingsPage() {
   const { user, signOut } = useAuth()
   const [showAuthModal, setShowAuthModal] = useState(false)
   const [defaultRadius, setDefaultRadius] = useState(1600)
   const [isSaving, setIsSaving] = useState(false)

   // Load preferences from localStorage
   useEffect(() => {
      const stored = localStorage.getItem('nowhere_preferences')
      if (stored) {
         try {
            const prefs = JSON.parse(stored)
            setDefaultRadius(prefs.defaultRadius || 1600)
         } catch {
            // Invalid JSON, ignore
         }
      }
   }, [])

   const handleSaveRadius = (radius: number) => {
      setIsSaving(true)
      setDefaultRadius(radius)

      // Save to localStorage
      const prefs = {
         defaultRadius: radius,
      }
      localStorage.setItem('nowhere_preferences', JSON.stringify(prefs))

      setTimeout(() => setIsSaving(false), 500)
   }

   const handleSignOut = async () => {
      if (confirm('Are you sure you want to sign out?')) {
         await signOut()
      }
   }

   return (
      <div className="flex h-screen overflow-hidden">
         <Sidebar />

         <main className="flex-1 overflow-y-auto overflow-x-hidden bg-bg">
            {/* Topbar */}
            <div className="sticky top-0 z-10 bg-[rgba(10,10,11,0.85)] backdrop-blur-xl border-b border-border px-7 py-4">
               <h1 className="font-display font-bold text-xl tracking-[-0.5px]">
                  Settings
               </h1>
            </div>

            <div className="flex items-start justify-center p-8">
               <div className="w-full max-w-lg">
                  {!user ? (
                     // Not authenticated - show sign-in prompt
                     <div className="bg-surface border border-border rounded-[--radius] p-8 text-center">
                        <div className="mb-4">
                           <Emoji emoji="🔒" size={32} />
                        </div>
                        <h2 className="font-display font-bold text-xl mb-3">Sign in to access settings</h2>
                        <p className="text-muted mb-6">
                           Create an account to save your preferences and manage your events.
                        </p>
                        <button
                           onClick={() => setShowAuthModal(true)}
                           className="w-full py-2.5 rounded-full bg-teal text-white font-semibold transition-opacity hover:opacity-90"
                        >
                           Sign in with email
                        </button>
                     </div>
                  ) : (
                     // Authenticated - show settings
                     <div className="space-y-4">
                        {/* Account Section */}
                        <div className="bg-surface border border-border rounded-[--radius] p-6">
                           <h2 className="font-display font-bold text-lg mb-4">Account</h2>

                           <div className="space-y-4">
                              <div>
                                 <label className="text-xs text-muted uppercase tracking-wider mb-1.5 block">
                                    Email
                                 </label>
                                 <div className="text-sm text-text font-medium">
                                    {user.email}
                                 </div>
                              </div>

                              <div>
                                 <label className="text-xs text-muted uppercase tracking-wider mb-1.5 block">
                                    Account ID
                                 </label>
                                 <div className="text-xs text-faint font-mono bg-surface2 rounded px-2 py-1.5 break-all">
                                    {user.id}
                                 </div>
                              </div>

                              <div className="pt-2">
                                 <button
                                    onClick={handleSignOut}
                                    className="w-full py-2.5 rounded-full bg-surface2 text-coral font-semibold border border-border2 transition-colors hover:bg-coral-dim hover:border-coral"
                                 >
                                    Sign out
                                 </button>
                              </div>
                           </div>
                        </div>

                        {/* Preferences Section */}
                        <div className="bg-surface border border-border rounded-[--radius] p-6">
                           <h2 className="font-display font-bold text-lg mb-4">Preferences</h2>

                           <div className="space-y-4">
                              <div>
                                 <label className="text-xs text-muted uppercase tracking-wider mb-2 block">
                                    Default search radius
                                 </label>
                                 <div className="space-y-2">
                                    {RADIUS_OPTIONS.map((option) => (
                                       <button
                                          key={option.value}
                                          onClick={() => handleSaveRadius(option.value)}
                                          className={`w-full text-left px-4 py-2.5 rounded-lg border transition-colors ${defaultRadius === option.value
                                             ? 'bg-teal-dim border-teal text-teal'
                                             : 'bg-surface2 border-border text-text hover:border-border2'
                                             }`}
                                       >
                                          <span className="text-sm font-medium">{option.label}</span>
                                       </button>
                                    ))}
                                 </div>
                                 {isSaving && (
                                    <p className="text-xs text-green mt-2">✓ Saved</p>
                                 )}
                              </div>

                              <div>
                                 <label className="text-xs text-muted uppercase tracking-wider mb-2 block">
                                    Notifications
                                 </label>
                                 <div className="bg-surface2 border border-border2 rounded-lg p-4 text-center">
                                    <p className="text-xs text-muted">Coming soon</p>
                                 </div>
                              </div>
                           </div>
                        </div>

                        {/* About Section */}
                        <div className="bg-surface border border-border rounded-[--radius] p-6">
                           <h2 className="font-display font-bold text-lg mb-4">About</h2>

                           <div className="space-y-3 text-sm">
                              <div className="flex justify-between">
                                 <span className="text-muted">Version</span>
                                 <span className="text-text font-medium">1.0.0</span>
                              </div>
                              <div className="flex justify-between">
                                 <span className="text-muted">Build</span>
                                 <span className="text-faint font-mono text-xs">MVP-2026.03</span>
                              </div>
                              <div className="pt-3 border-t border-border2">
                                 <a
                                    href="https://github.com"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-teal hover:underline text-sm"
                                 >
                                    GitHub →
                                 </a>
                              </div>
                           </div>
                        </div>
                     </div>
                  )}
               </div>
            </div>
         </main>

         {showAuthModal && <AuthModal onClose={() => setShowAuthModal(false)} />}
      </div>
   )
}
