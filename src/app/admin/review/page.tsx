'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/providers/SupabaseProvider'
import { createClient } from '@/lib/supabase/client'
import { Sidebar } from '@/components/layout/Sidebar'

interface EmailQueueItem {
   id: string
   from_address: string
   subject: string | null
   body_text: string | null
   body_html: string | null
   parsed_data: {
      title?: string
      description?: string
      emoji?: string
      category?: string
      tags?: string[]
      starts_at?: string | null
      ends_at?: string | null
      price_label?: string
      address?: string | null
      confidence?: number
   } | null
   matched_venue_id: string | null
   status: 'pending' | 'approved' | 'rejected'
   confidence: number | null
   received_at: string
}

interface Venue {
   id: string
   name: string
}

export default function AdminReviewPage() {
   const { user, loading: authLoading } = useAuth()
   const router = useRouter()
   const supabase = createClient()

   const [emailQueue, setEmailQueue] = useState<EmailQueueItem[]>([])
   const [venues, setVenues] = useState<Record<string, Venue>>({})
   const [selectedEmail, setSelectedEmail] = useState<EmailQueueItem | null>(null)
   const [isLoading, setIsLoading] = useState(true)
   const [isProcessing, setIsProcessing] = useState(false)
   const [rejectReason, setRejectReason] = useState('')
   const [showRejectModal, setShowRejectModal] = useState(false)

   // Check auth on mount
   useEffect(() => {
      if (!authLoading && !user) {
         router.push('/')
         return
      }

      // Check if user is admin
      if (user) {
         const checkAdmin = async () => {
            const { data: isAdmin } = await supabase.rpc('is_admin_user')
            if (!isAdmin) {
               router.push('/')
            }
         }
         checkAdmin()
      }
   }, [user, authLoading, router, supabase])

   // Fetch email queue
   useEffect(() => {
      const fetchEmailQueue = async () => {
         try {
            // Fetch from API endpoint instead of direct database query
            const response = await fetch('/api/admin/email-queue')

            if (!response.ok) {
               throw new Error('Failed to fetch email queue')
            }

            const { data } = await response.json()

            if (data) {
               // Parse parsed_data if it's a string
               const processedData = data.map((item: any) => ({
                  ...item,
                  parsed_data: typeof item.parsed_data === 'string'
                     ? JSON.parse(item.parsed_data)
                     : item.parsed_data
               }))
               setEmailQueue(processedData as EmailQueueItem[])

               // Fetch venue names for matched venues
               const venueIds = data
                  .map((item: any) => item.matched_venue_id)
                  .filter(Boolean) as string[]

               if (venueIds.length > 0) {
                  const { data: venueData } = await supabase
                     .from('venues')
                     .select('id, name')
                     .in('id', venueIds)

                  if (venueData) {
                     const venueMap: Record<string, Venue> = {}
                     venueData.forEach(v => {
                        venueMap[v.id] = v
                     })
                     setVenues(venueMap)
                  }
               }
            }
         } catch (error) {
            console.error('Error fetching email queue:', error)
         } finally {
            setIsLoading(false)
         }
      }

      if (user) fetchEmailQueue()
   }, [user, supabase])

   const getConfidenceBadge = (confidence: number | null) => {
      if (!confidence) {
         return <span className="text-xs px-2 py-0.5 rounded bg-muted/20 text-muted">Unknown</span>
      }

      if (confidence > 0.8) {
         return (
            <span className="text-xs px-2 py-0.5 rounded bg-green/20 text-green font-medium">
               {(confidence * 100).toFixed(0)}% High
            </span>
         )
      } else if (confidence >= 0.5) {
         return (
            <span className="text-xs px-2 py-0.5 rounded bg-amber/20 text-amber font-medium">
               {(confidence * 100).toFixed(0)}% Medium
            </span>
         )
      } else {
         return (
            <span className="text-xs px-2 py-0.5 rounded bg-coral/20 text-coral font-medium">
               {(confidence * 100).toFixed(0)}% Low
            </span>
         )
      }
   }

   const handleApprove = async (emailId: string) => {
      setIsProcessing(true)
      try {
         const response = await fetch(`/api/email-queue/${emailId}/approve`, {
            method: 'POST'
         })

         if (!response.ok) throw new Error('Failed to approve')

         // Remove from queue
         setEmailQueue(prev => prev.filter(e => e.id !== emailId))
         if (selectedEmail?.id === emailId) {
            setSelectedEmail(null)
         }
      } catch (err) {
         console.error('Approve error:', err)
         alert('Failed to approve email')
      } finally {
         setIsProcessing(false)
      }
   }

   const handleRejectClick = (email: EmailQueueItem) => {
      setSelectedEmail(email)
      setShowRejectModal(true)
   }

   const handleRejectConfirm = async () => {
      if (!selectedEmail) return

      setIsProcessing(true)
      try {
         const response = await fetch(`/api/email-queue/${selectedEmail.id}/reject`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ reason: rejectReason || null })
         })

         if (!response.ok) throw new Error('Failed to reject')

         // Remove from queue
         setEmailQueue(prev => prev.filter(e => e.id !== selectedEmail.id))
         setSelectedEmail(null)
         setShowRejectModal(false)
         setRejectReason('')
      } catch (err) {
         console.error('Reject error:', err)
         alert('Failed to reject email')
      } finally {
         setIsProcessing(false)
      }
   }

   if (authLoading || !user) {
      return (
         <div className="flex h-screen items-center justify-center bg-bg">
            <div className="text-muted">Loading...</div>
         </div>
      )
   }

   return (
      <div className="flex h-screen overflow-hidden">
         <Sidebar />

         <main className="flex-1 overflow-y-auto">
            <div className="p-7">
               <div className="flex items-center justify-between mb-6">
                  <h1 className="font-display font-bold text-2xl">
                     Email <span className="text-teal">Review Queue</span>
                  </h1>
                  <div className="flex items-center gap-3">
                     <a
                        href="/admin/venues"
                        className="text-sm text-teal hover:underline font-medium"
                     >
                        ← Venue Admin
                     </a>
                     <span className="text-border">|</span>
                     <a
                        href="/admin/accuracy"
                        className="text-sm text-teal hover:underline font-medium"
                     >
                        AI Accuracy Stats →
                     </a>
                  </div>
               </div>

               {isLoading ? (
                  <div className="text-muted text-sm">Loading queue...</div>
               ) : emailQueue.length === 0 ? (
                  <div className="bg-surface2 border border-border rounded-lg p-8 text-center">
                     <div className="text-4xl mb-2">✅</div>
                     <div className="text-lg font-semibold mb-1">All caught up!</div>
                     <div className="text-sm text-muted">No pending emails to review</div>
                  </div>
               ) : (
                  <div className="flex gap-6">
                     {/* Queue List */}
                     <div className="flex-1">
                        <h2 className="text-sm font-semibold mb-3">
                           {emailQueue.length} Pending Review
                        </h2>

                        <div className="space-y-3">
                           {emailQueue.map((email) => {
                              const parsedData = email.parsed_data
                              const confidence = email.confidence || parsedData?.confidence || null
                              const venue = email.matched_venue_id ? venues[email.matched_venue_id] : null

                              return (
                                 <div
                                    key={email.id}
                                    className={`bg-surface2 border rounded-lg p-4 transition-colors cursor-pointer ${selectedEmail?.id === email.id
                                       ? 'border-teal bg-teal/5'
                                       : 'border-border hover:border-border2'
                                       }`}
                                    onClick={() => setSelectedEmail(email)}
                                 >
                                    <div className="flex items-start justify-between gap-3 mb-2">
                                       <div className="flex-1 min-w-0">
                                          <div className="font-medium text-sm mb-1 flex items-center gap-2">
                                             <span className="truncate">
                                                {parsedData?.emoji || '📧'} {parsedData?.title || email.subject || 'No Subject'}
                                             </span>
                                          </div>
                                          <div className="text-xs text-muted flex items-center gap-2">
                                             <span className="truncate">{email.from_address}</span>
                                             {venue && (
                                                <span className="text-teal">→ {venue.name}</span>
                                             )}
                                          </div>
                                       </div>
                                       {getConfidenceBadge(confidence)}
                                    </div>

                                    {parsedData && (
                                       <div className="text-xs text-muted mt-2 flex items-center gap-3">
                                          {parsedData.category && (
                                             <span className="text-teal">#{parsedData.category}</span>
                                          )}
                                          {parsedData.starts_at && (
                                             <span>{new Date(parsedData.starts_at).toLocaleDateString()}</span>
                                          )}
                                          {parsedData.price_label && (
                                             <span>{parsedData.price_label}</span>
                                          )}
                                       </div>
                                    )}

                                    <div className="flex gap-2 mt-3">
                                       <button
                                          onClick={(e) => {
                                             e.stopPropagation()
                                             handleApprove(email.id)
                                          }}
                                          disabled={isProcessing}
                                          className="flex-1 bg-green/20 text-green text-xs font-semibold py-1.5 rounded transition-colors hover:bg-green/30 disabled:opacity-50"
                                       >
                                          ✓ Approve
                                       </button>
                                       <button
                                          onClick={(e) => {
                                             e.stopPropagation()
                                             handleRejectClick(email)
                                          }}
                                          disabled={isProcessing}
                                          className="flex-1 bg-coral/20 text-coral text-xs font-semibold py-1.5 rounded transition-colors hover:bg-coral/30 disabled:opacity-50"
                                       >
                                          ✗ Reject
                                       </button>
                                    </div>
                                 </div>
                              )
                           })}
                        </div>
                     </div>

                     {/* Detail Panel */}
                     {selectedEmail && (
                        <div className="w-[500px] bg-surface2 border border-border rounded-lg p-4 max-h-[calc(100vh-200px)] overflow-y-auto">
                           <div className="flex items-start justify-between mb-4">
                              <h3 className="font-semibold text-lg">Email Details</h3>
                              <button
                                 onClick={() => setSelectedEmail(null)}
                                 className="text-muted hover:text-text"
                              >
                                 <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M18 6L6 18M6 6l12 12" />
                                 </svg>
                              </button>
                           </div>

                           {/* Parsed Data */}
                           <div className="mb-4 pb-4 border-b border-border">
                              <h4 className="text-xs font-semibold text-muted uppercase tracking-wider mb-3">
                                 AI Extracted Data
                              </h4>

                              <div className="space-y-3 text-sm">
                                 <div className="flex items-center gap-2">
                                    <span className="text-muted text-xs min-w-[80px]">Confidence:</span>
                                    {getConfidenceBadge(selectedEmail.confidence || selectedEmail.parsed_data?.confidence || null)}
                                 </div>

                                 {selectedEmail.parsed_data?.title && (
                                    <div>
                                       <span className="text-muted text-xs block mb-1">Title:</span>
                                       <span className="font-medium">{selectedEmail.parsed_data.title}</span>
                                    </div>
                                 )}

                                 {selectedEmail.parsed_data?.description && (
                                    <div>
                                       <span className="text-muted text-xs block mb-1">Description:</span>
                                       <span className="text-sm">{selectedEmail.parsed_data.description}</span>
                                    </div>
                                 )}

                                 <div className="grid grid-cols-2 gap-3">
                                    {selectedEmail.parsed_data?.category && (
                                       <div>
                                          <span className="text-muted text-xs block mb-1">Category:</span>
                                          <span className="text-teal font-medium">{selectedEmail.parsed_data.category}</span>
                                       </div>
                                    )}

                                    {selectedEmail.parsed_data?.emoji && (
                                       <div>
                                          <span className="text-muted text-xs block mb-1">Emoji:</span>
                                          <span className="text-xl">{selectedEmail.parsed_data.emoji}</span>
                                       </div>
                                    )}
                                 </div>

                                 {selectedEmail.parsed_data?.starts_at && (
                                    <div>
                                       <span className="text-muted text-xs block mb-1">Starts:</span>
                                       <span>{new Date(selectedEmail.parsed_data.starts_at).toLocaleString()}</span>
                                    </div>
                                 )}

                                 {selectedEmail.parsed_data?.ends_at && (
                                    <div>
                                       <span className="text-muted text-xs block mb-1">Ends:</span>
                                       <span>{new Date(selectedEmail.parsed_data.ends_at).toLocaleString()}</span>
                                    </div>
                                 )}

                                 {selectedEmail.parsed_data?.price_label && (
                                    <div>
                                       <span className="text-muted text-xs block mb-1">Price:</span>
                                       <span>{selectedEmail.parsed_data.price_label}</span>
                                    </div>
                                 )}

                                 {selectedEmail.parsed_data?.address && (
                                    <div>
                                       <span className="text-muted text-xs block mb-1">Address:</span>
                                       <span className="text-sm">{selectedEmail.parsed_data.address}</span>
                                    </div>
                                 )}

                                 {selectedEmail.parsed_data?.tags && selectedEmail.parsed_data.tags.length > 0 && (
                                    <div>
                                       <span className="text-muted text-xs block mb-1">Tags:</span>
                                       <div className="flex flex-wrap gap-1">
                                          {selectedEmail.parsed_data.tags.map((tag, i) => (
                                             <span key={i} className="text-xs px-2 py-0.5 rounded bg-teal/10 text-teal">
                                                {tag}
                                             </span>
                                          ))}
                                       </div>
                                    </div>
                                 )}
                              </div>
                           </div>

                           {/* Original Email */}
                           <div>
                              <h4 className="text-xs font-semibold text-muted uppercase tracking-wider mb-3">
                                 Original Email
                              </h4>

                              <div className="space-y-2 text-xs">
                                 <div>
                                    <span className="text-muted">From:</span> {selectedEmail.from_address}
                                 </div>
                                 {selectedEmail.subject && (
                                    <div>
                                       <span className="text-muted">Subject:</span> {selectedEmail.subject}
                                    </div>
                                 )}
                                 <div>
                                    <span className="text-muted">Received:</span>{' '}
                                    {new Date(selectedEmail.received_at).toLocaleString()}
                                 </div>
                              </div>

                              {selectedEmail.body_text && (
                                 <div className="mt-3">
                                    <span className="text-muted text-xs block mb-2">Body:</span>
                                    <div className="bg-surface border border-border2 rounded p-3 text-xs max-h-64 overflow-y-auto whitespace-pre-wrap font-mono">
                                       {selectedEmail.body_text}
                                    </div>
                                 </div>
                              )}
                           </div>
                        </div>
                     )}
                  </div>
               )}
            </div>
         </main>

         {/* Reject Modal */}
         {showRejectModal && selectedEmail && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
               <div className="bg-surface2 border border-border rounded-lg p-6 w-full max-w-md">
                  <h3 className="font-semibold mb-4">Reject Email</h3>

                  <p className="text-sm text-muted mb-4">
                     Are you sure you want to reject this email? You can optionally provide a reason.
                  </p>

                  <div className="mb-4">
                     <label className="block text-xs text-muted mb-1">Reason (optional)</label>
                     <textarea
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                        placeholder="e.g., Incorrect date, spam, duplicate, etc."
                        rows={3}
                        className="w-full bg-surface border border-border2 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-coral"
                     />
                  </div>

                  <div className="flex gap-3">
                     <button
                        type="button"
                        onClick={() => {
                           setShowRejectModal(false)
                           setRejectReason('')
                        }}
                        disabled={isProcessing}
                        className="flex-1 bg-surface border border-border rounded-lg py-2 text-sm font-medium disabled:opacity-50"
                     >
                        Cancel
                     </button>
                     <button
                        onClick={handleRejectConfirm}
                        disabled={isProcessing}
                        className="flex-1 bg-coral text-white rounded-lg py-2 text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-50"
                     >
                        {isProcessing ? 'Rejecting...' : 'Reject'}
                     </button>
                  </div>
               </div>
            </div>
         )}
      </div>
   )
}
