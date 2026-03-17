'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface EmailQueueItem {
   id: string
   from_address: string
   subject: string | null
   status: string
   parsed_data: {
      title?: string
      category?: string
      emoji?: string
   } | null
}

interface Venue {
   id: string
   name: string
   category: string | null
   vibe_tags: string[] | null
}

const categoryEmojis: Record<string, string> = {
   music: '🎷',
   food: '🍜',
   art: '🎨',
   sport: '🏀',
   social: '🎤',
}

export function VenuePanel() {
   const [emails, setEmails] = useState<EmailQueueItem[]>([])
   const [venues, setVenues] = useState<Venue[]>([])
   const supabase = createClient()

   useEffect(() => {
      // Fetch pending emails
      const fetchEmails = async () => {
         const { data } = await supabase
            .from('email_queue')
            .select('id, from_address, subject, status, parsed_data')
            .eq('status', 'pending')
            .order('received_at', { ascending: false })
            .limit(5)

         if (data) setEmails(data as EmailQueueItem[])
      }

      // Fetch active venues
      const fetchVenues = async () => {
         const { data } = await supabase
            .from('venues')
            .select('id, name, category, vibe_tags')
            .eq('verified', true)
            .limit(10)

         if (data) setVenues(data as Venue[])
      }

      fetchEmails()
      fetchVenues()
   }, [supabase])

   const handleApprove = async (emailId: string) => {
      const response = await fetch(`/api/email-queue/${emailId}/approve`, {
         method: 'POST',
      })

      if (response.ok) {
         setEmails(emails.filter((e) => e.id !== emailId))
      }
   }

   const handleReject = async (emailId: string) => {
      if (!confirm('Are you sure you want to reject this email?')) {
         return
      }

      const response = await fetch(`/api/email-queue/${emailId}/reject`, {
         method: 'POST',
      })

      if (response.ok) {
         setEmails(emails.filter((e) => e.id !== emailId))
      }
   }

   return (
      <>
         {emails.length > 0 && (
            <div className="bg-amber-dim border border-[rgba(245,166,35,.2)] rounded-[--radius-sm] p-3 mb-2.5">
               <div className="text-xs font-semibold text-amber mb-2 flex items-center gap-1.5">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor strokeWidth-2">
                     <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                     <polyline points="22,6 12,13 2,6" />
                  </svg>
                  {emails.length} emails to review
               </div>

               {emails.map((email) => (
                  <div key={email.id} className="bg-surface2 rounded-lg p-2.5 mb-1.5 last:mb-0">
                     <div className="text-[11px] font-semibold mb-0.5">{email.from_address}</div>
                     <div className="text-[11px] text-muted mb-1.5">{email.subject}</div>
                     <div className="flex gap-1.5">
                        <button
                           onClick={() => handleApprove(email.id)}
                           className="text-[10px] font-semibold py-1 px-2.5 rounded-full border-none cursor-pointer bg-green text-[#0a1f15] transition-opacity hover:opacity-90"
                        >
                           ✓ Approve
                        </button>
                        <button className="text-[10px] font-semibold py-1 px-2.5 rounded-full bg-surface text-muted border border-border2 cursor-not-allowed opacity-50">
                           Edit
                        </button>
                        <button
                           onClick={() => handleReject(email.id)}
                           className="text-[10px] font-semibold py-1 px-2.5 rounded-full border-none cursor-pointer bg-coral text-white transition-opacity hover:opacity-90"
                        >
                           ✕ Reject
                        </button>
                     </div>
                  </div>
               ))}
            </div>
         )}

         <div className="text-[11px] text-muted mb-2.5 uppercase tracking-wider">
            Active venues
         </div>

         {venues.map((venue) => (
            <div
               key={venue.id}
               className="bg-surface2 rounded-[--radius-sm] p-3 mb-2.5 cursor-pointer border border-transparent transition-colors hover:border-border2"
            >
               <div className="flex items-center gap-2.5 mb-1.5">
                  <div className="w-[34px] h-[34px] rounded-[10px] bg-purple-dim flex items-center justify-center text-base shrink-0">
                     {categoryEmojis[venue.category || 'music'] || '📍'}
                  </div>
                  <div>
                     <div className="text-[13px] font-semibold">{venue.name}</div>
                     <div className="text-[11px] text-muted">
                        {venue.vibe_tags?.slice(0, 2).join(' / ')}
                     </div>
                  </div>
               </div>
            </div>
         ))}
      </>
   )
}