'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { Emoji } from '@/components/ui/Emoji'

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
   attendeeId: string | null
   displayName: string | null
   onJoin?: (eventId: string) => Promise<{ attendeeId: string; displayName: string } | null>
}

const avatarGradients = [
   'from-teal to-blue',
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

export function ChatPanel({ eventId, eventName, eventEmoji, attendeeId, displayName, onJoin }: ChatPanelProps) {
   const [messages, setMessages] = useState<Message[]>([])
   const [newMessage, setNewMessage] = useState('')
   const [isLoading, setIsLoading] = useState(true)
   const [isJoining, setIsJoining] = useState(false)
   const [currentAttendeeId, setCurrentAttendeeId] = useState(attendeeId)
   const [currentDisplayName, setCurrentDisplayName] = useState(displayName)
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

   // Sync attendeeId and displayName from props
   useEffect(() => {
      setCurrentAttendeeId(attendeeId)
      setCurrentDisplayName(displayName)
   }, [attendeeId, displayName])

   const sendMessage = async (messageText?: string) => {
      const textToSend = messageText || newMessage.trim()
      if (!textToSend || !currentAttendeeId) return

      const { error } = await supabase.from('messages').insert({
         event_id: eventId,
         attendee_id: currentAttendeeId,
         display_name: currentDisplayName,
         body: textToSend,
      })

      if (!error) {
         setNewMessage('')
      }
   }

   const handleJoin = async () => {
      if (!onJoin || isJoining) return

      setIsJoining(true)
      try {
         const result = await onJoin(eventId)
         if (result) {
            setCurrentAttendeeId(result.attendeeId)
            setCurrentDisplayName(result.displayName)

            // Wait for attendee to be set, then send the "I'm going!" message
            const { error } = await supabase.from('messages').insert({
               event_id: eventId,
               attendee_id: result.attendeeId,
               display_name: result.displayName,
               body: "I'm going! 🎉",
            })

            if (error) {
               console.error('Failed to send join message:', error)
            }
         }
      } catch (err) {
         console.error('Failed to join event:', err)
      } finally {
         setIsJoining(false)
      }
   }

   const handleJoinAndSend = async () => {
      if (!onJoin || isJoining || !newMessage.trim()) return

      const messageToSend = newMessage.trim()
      setIsJoining(true)
      try {
         const result = await onJoin(eventId)
         if (result) {
            setCurrentAttendeeId(result.attendeeId)
            setCurrentDisplayName(result.displayName)

            // Send "I'm going!" message first
            await supabase.from('messages').insert({
               event_id: eventId,
               attendee_id: result.attendeeId,
               display_name: result.displayName,
               body: "I'm going! 🎉",
            })

            // Then send the user's message
            const { error } = await supabase.from('messages').insert({
               event_id: eventId,
               attendee_id: result.attendeeId,
               display_name: result.displayName,
               body: messageToSend,
            })

            if (!error) {
               setNewMessage('')
            }
         }
      } catch (err) {
         console.error('Failed to join event:', err)
      } finally {
         setIsJoining(false)
      }
   }

   const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
         e.preventDefault()
         sendMessage()
      }
   }

   const isJoined = !!currentAttendeeId

   return (
      <>
         <div className="bg-surface2 rounded-[--radius-sm] p-2.5 mb-3.5 flex items-center gap-2.5">
            <Emoji emoji={eventEmoji} size={20} />
            <div>
               <div className="text-[13px] font-semibold">{eventName}</div>
               <div className="text-[11px] text-muted">Tonight 8pm · {messages.length} messages</div>
            </div>
         </div>

         <div className="flex-1 overflow-y-auto" id="chat-messages">
            {isLoading ? (
               <div className="text-center text-muted text-sm py-8">Loading messages...</div>
            ) : messages.length === 0 ? (
               <div className="text-center text-muted text-sm py-8 flex items-center justify-center gap-2">
                  No messages yet. Say hi! <Emoji emoji="👋" size={16} />
               </div>
            ) : (
               messages.map((msg) => {
                  const isMe = msg.attendee_id === currentAttendeeId
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
                                 ? 'bg-teal text-white rounded-br-[4px]'
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

         {/* Message input - always visible */}
         <div className="p-3 border-t border-border flex gap-2 items-center">
            <input
               type="text"
               className="flex-1 bg-surface2 border border-border rounded-full px-3.5 py-2 font-body text-[13px] text-text outline-none transition-colors focus:border-teal placeholder:text-muted"
               placeholder={isJoined ? "Message the group..." : "Type a message..."}
               value={newMessage}
               onChange={(e) => setNewMessage(e.target.value)}
               onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                     e.preventDefault()
                     if (isJoined) {
                        sendMessage()
                     } else if (newMessage.trim()) {
                        handleJoinAndSend()
                     }
                  }
               }}
               disabled={!isJoined && !onJoin}
            />
            <button
               onClick={() => {
                  if (isJoined) {
                     sendMessage()
                  } else if (newMessage.trim()) {
                     handleJoinAndSend()
                  }
               }}
               disabled={!newMessage.trim() || isJoining || (!isJoined && !onJoin)}
               className="w-[34px] h-[34px] rounded-full bg-teal border-none cursor-pointer flex items-center justify-center transition-opacity hover:opacity-85 disabled:opacity-50 shrink-0"
            >
               <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 stroke-white fill-none strokeWidth-[2.5] strokeLinecap-round strokeLinejoin-round">
                  <line x1="22" y1="2" x2="11" y2="13" />
                  <polygon points="22 2 15 22 11 13 2 9 22 2" />
               </svg>
            </button>
         </div>

         {/* I'm going button - only for non-joined users */}
         {!isJoined && (
            <div className="px-3 pb-3">
               <button
                  onClick={handleJoin}
                  disabled={isJoining}
                  className="w-full bg-surface2 text-teal border border-teal rounded-full px-6 py-2.5 text-[13px] font-semibold font-display cursor-pointer transition-all duration-150 hover:bg-teal hover:text-white disabled:opacity-50"
               >
                  {isJoining ? 'Joining...' : "I'm going! 🎉"}
               </button>
            </div>
         )}
      </>
   )
}