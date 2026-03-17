'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { RealtimeChannel } from '@supabase/supabase-js'

interface Message {
   id: string
   event_id: string
   attendee_id: string
   display_name: string | null
   body: string
   created_at: string
}

interface ChatPanelProps {
   eventId: string
   eventName: string
   eventEmoji: string
   attendeeId: string
   displayName: string
}

const avatarGradients = [
   'from-purple to-blue',
   'from-green to-blue',
   'from-amber to-coral',
   'from-coral-dim to-coral',
]

function getInitials(name: string | null): string {
   if (!name) return 'Me'
   const parts = name.split(' ')
   if (parts.length >= 2) {
      return parts[0][0] + parts[1][0]
   }
   return name.substring(0, 2).toUpperCase()
}

function getGradientForName(name: string | null): string {
   if (!name) return avatarGradients[0]
   const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
   return avatarGradients[hash % avatarGradients.length]
}

export function ChatPanel({ eventId, eventName, eventEmoji, attendeeId, displayName }: ChatPanelProps) {
   const [messages, setMessages] = useState<Message[]>([])
   const [newMessage, setNewMessage] = useState('')
   const [isLoading, setIsLoading] = useState(true)
   const messagesEndRef = useRef<HTMLDivElement>(null)
   const channelRef = useRef<RealtimeChannel | null>(null)
   const supabase = createClient()

   // Fetch initial messages
   useEffect(() => {
      async function fetchMessages() {
         const { data, error } = await supabase
            .from('messages')
            .select('*')
            .eq('event_id', eventId)
            .order('created_at', { ascending: true })

         if (!error && data) {
            setMessages(data as Message[])
         }
         setIsLoading(false)
      }

      fetchMessages()

      // Subscribe to realtime updates
      const channel = supabase
         .channel(`event-${eventId}`)
         .on(
            'postgres_changes',
            {
               event: 'INSERT',
               schema: 'public',
               table: 'messages',
               filter: `event_id=eq.${eventId}`,
            },
            (payload) => {
               setMessages((prev) => [...prev, payload.new as Message])
            }
         )
         .subscribe()

      channelRef.current = channel

      return () => {
         if (channelRef.current) {
            supabase.removeChannel(channelRef.current)
         }
      }
   }, [eventId, supabase])

   // Auto-scroll to bottom
   useEffect(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
   }, [messages])

   const sendMessage = async () => {
      if (!newMessage.trim()) return

      const { error } = await supabase.from('messages').insert({
         event_id: eventId,
         attendee_id: attendeeId,
         display_name: displayName,
         body: newMessage.trim(),
      })

      if (!error) {
         setNewMessage('')
      }
   }

   const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
         e.preventDefault()
         sendMessage()
      }
   }

   return (
      <>
         <div className="bg-surface2 rounded-[--radius-sm] p-2.5 mb-3.5 flex items-center gap-2.5">
            <div className="text-xl">{eventEmoji}</div>
            <div>
               <div className="text-[13px] font-semibold">{eventName}</div>
               <div className="text-[11px] text-muted">Tonight 8pm · {messages.length} messages</div>
            </div>
         </div>

         <div className="flex-1 overflow-y-auto" id="chat-messages">
            {isLoading ? (
               <div className="text-center text-muted text-sm py-8">Loading messages...</div>
            ) : messages.length === 0 ? (
               <div className="text-center text-muted text-sm py-8">No messages yet. Say hi! 👋</div>
            ) : (
               messages.map((msg) => {
                  const isMe = msg.attendee_id === attendeeId
                  return (
                     <div key={msg.id} className="mb-2.5">
                        {!isMe && (
                           <div className="text-[10px] text-muted mb-1 ml-[34px]">{msg.display_name}</div>
                        )}
                        {isMe && (
                           <div className="text-[10px] text-muted mb-1 text-right mr-[34px]">You</div>
                        )}
                        <div className={`msg flex gap-2 ${isMe ? 'flex-row-reverse' : ''}`}>
                           <div
                              className={`w-[26px] h-[26px] rounded-full text-[9px] font-bold flex items-center justify-center shrink-0 mt-0.5 bg-gradient-to-br ${getGradientForName(msg.display_name)} text-white`}
                           >
                              {getInitials(msg.display_name)}
                           </div>
                           <div
                              className={`max-w-[190px] px-3 py-2 text-[12px] leading-relaxed rounded-[14px] ${isMe
                                    ? 'bg-purple text-white rounded-br-[4px]'
                                    : 'bg-surface2 text-text rounded-bl-[4px]'
                                 }`}
                           >
                              {msg.body}
                           </div>
                        </div>
                     </div>
                  )
               })
            )}
            <div ref={messagesEndRef} />
         </div>

         <div className="p-3 border-t border-border flex gap-2 items-center">
            <input
               type="text"
               className="flex-1 bg-surface2 border border-border rounded-full px-3.5 py-2 font-body text-[13px] text-text outline-none transition-colors focus:border-purple placeholder:text-muted"
               placeholder="Message the group..."
               value={newMessage}
               onChange={(e) => setNewMessage(e.target.value)}
               onKeyDown={handleKeyDown}
            />
            <button
               onClick={sendMessage}
               disabled={!newMessage.trim()}
               className="w-[34px] h-[34px] rounded-full bg-purple border-none cursor-pointer flex items-center justify-center transition-opacity hover:opacity-85 disabled:opacity-50 shrink-0"
            >
               <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 stroke-white fill-none strokeWidth-[2.5] strokeLinecap-round strokeLinejoin-round">
                  <line x1="22" y1="2" x2="11" y2="13" />
                  <polygon points="22 2 15 22 11 13 2 9 22 2" />
               </svg>
            </button>
         </div>
      </>
   )
}