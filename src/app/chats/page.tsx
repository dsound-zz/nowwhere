'use client'

import { useEffect, useState } from 'react'
import { Sidebar } from '@/components/layout/Sidebar'
import { ChatPanel } from '@/components/chat/ChatPanel'
import { useAuth } from '@/components/providers/SupabaseProvider'
import { AuthModal } from '@/components/auth/AuthModal'
import { createClient } from '@/lib/supabase/client'

interface ChatPreview {
   event_id: string
   event_title: string
   event_emoji: string
   attendee_id: string
   last_message: string | null
   last_message_at: string | null
   unread_count: number
}

export default function ChatsPage() {
   const { user } = useAuth()
   const [showAuthModal, setShowAuthModal] = useState(false)
   const [chats, setChats] = useState<ChatPreview[]>([])
   const [selectedChat, setSelectedChat] = useState<ChatPreview | null>(null)
   const [isLoading, setIsLoading] = useState(true)
   const supabase = createClient()

   useEffect(() => {
      if (!user) {
         setIsLoading(false)
         return
      }

      const fetchChats = async () => {
         setIsLoading(true)

         // Get all events the user has joined
         const { data: attendees, error: attendeesError } = await supabase
            .from('attendees')
            .select(`
          id,
          event_id,
          events!inner (
            id,
            title,
            emoji,
            status,
            ends_at
          )
        `)
            .eq('user_id', user.id)

         if (attendeesError || !attendees) {
            setIsLoading(false)
            return
         }

         // Filter to only live events
         const liveAttendees = attendees.filter((a: any) => {
            const event = a.events
            if (!event) return false
            const endsAt = event.ends_at ? new Date(event.ends_at) : new Date()
            return event.status === 'live' && endsAt > new Date()
         })

         // For each event, get the last message
         const chatPreviews: ChatPreview[] = await Promise.all(
            liveAttendees.map(async (attendee: any) => {
               const event = attendee.events

               // Get last message for this event
               const { data: messages } = await supabase
                  .from('messages')
                  .select('body, created_at')
                  .eq('event_id', event.id)
                  .order('created_at', { ascending: false })
                  .limit(1)

               const lastMessage = messages?.[0]

               return {
                  event_id: event.id,
                  event_title: event.title,
                  event_emoji: event.emoji,
                  attendee_id: attendee.id,
                  last_message: lastMessage?.body || null,
                  last_message_at: lastMessage?.created_at || null,
                  unread_count: 0, // TODO: Track read status
               }
            })
         )

         // Sort by most recent activity
         chatPreviews.sort((a, b) => {
            if (!a.last_message_at) return 1
            if (!b.last_message_at) return -1
            return new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime()
         })

         setChats(chatPreviews)
         setIsLoading(false)
      }

      fetchChats()

      // Subscribe to new messages
      const channel = supabase
         .channel('chats-updates')
         .on(
            'postgres_changes',
            {
               event: 'INSERT',
               schema: 'public',
               table: 'messages',
            },
            () => {
               // Refresh chats when new messages come in
               fetchChats()
            }
         )
         .subscribe()

      return () => {
         supabase.removeChannel(channel)
      }
   }, [user, supabase])

   const formatTime = (isoString: string) => {
      const date = new Date(isoString)
      const now = new Date()
      const diffMs = now.getTime() - date.getTime()
      const diffMins = Math.floor(diffMs / 60000)
      const diffHours = Math.floor(diffMins / 60)
      const diffDays = Math.floor(diffHours / 24)

      if (diffMins < 1) return 'Just now'
      if (diffMins < 60) return `${diffMins}m ago`
      if (diffHours < 24) return `${diffHours}h ago`
      if (diffDays < 7) return `${diffDays}d ago`
      return date.toLocaleDateString()
   }

   return (
      <div className="flex h-screen overflow-hidden">
         <Sidebar />

         <main className="flex-1 flex overflow-hidden">
            {/* Chat list */}
            <div className="w-full lg:w-[400px] border-r border-border flex flex-col overflow-hidden">
               {/* Header */}
               <div className="border-b border-border px-6 py-4">
                  <h1 className="font-display font-bold text-xl tracking-[-0.5px]">
                     Chats
                  </h1>
               </div>

               {/* Content */}
               <div className="flex-1 overflow-y-auto">
                  {!user ? (
                     <div className="flex items-center justify-center h-full px-6">
                        <div className="text-center">
                           <div className="text-4xl mb-3">💬</div>
                           <h2 className="font-display font-bold text-lg mb-2">Sign in to see your chats</h2>
                           <p className="text-sm text-muted mb-4">
                              Join events to start chatting with other attendees.
                           </p>
                           <button
                              onClick={() => setShowAuthModal(true)}
                              className="px-4 py-2 rounded-full bg-purple text-white text-sm font-semibold transition-opacity hover:opacity-90"
                           >
                              Sign in
                           </button>
                        </div>
                     </div>
                  ) : isLoading ? (
                     <div className="flex items-center justify-center h-full text-muted text-sm">
                        Loading chats...
                     </div>
                  ) : chats.length === 0 ? (
                     <div className="flex items-center justify-center h-full px-6">
                        <div className="text-center">
                           <div className="text-4xl mb-3">📭</div>
                           <h2 className="font-display font-bold text-lg mb-2">No chats yet</h2>
                           <p className="text-sm text-muted mb-4">
                              Join an event to start chatting.
                           </p>
                           <a
                              href="/"
                              className="inline-block px-4 py-2 rounded-full bg-purple text-white text-sm font-semibold transition-opacity hover:opacity-90"
                           >
                              Browse events
                           </a>
                        </div>
                     </div>
                  ) : (
                     <div className="divide-y divide-border">
                        {chats.map((chat) => (
                           <button
                              key={chat.event_id}
                              onClick={() => setSelectedChat(chat)}
                              className={`w-full text-left px-6 py-4 transition-colors hover:bg-surface2 ${selectedChat?.event_id === chat.event_id ? 'bg-surface2' : ''
                                 }`}
                           >
                              <div className="flex items-start gap-3">
                                 <div className="text-2xl flex-shrink-0">{chat.event_emoji}</div>
                                 <div className="flex-1 min-w-0">
                                    <div className="flex items-baseline justify-between mb-1">
                                       <h3 className="font-semibold text-sm truncate">{chat.event_title}</h3>
                                       {chat.last_message_at && (
                                          <span className="text-xs text-muted ml-2 flex-shrink-0">
                                             {formatTime(chat.last_message_at)}
                                          </span>
                                       )}
                                    </div>
                                    {chat.last_message ? (
                                       <p className="text-xs text-muted truncate">{chat.last_message}</p>
                                    ) : (
                                       <p className="text-xs text-faint italic">No messages yet</p>
                                    )}
                                 </div>
                              </div>
                           </button>
                        ))}
                     </div>
                  )}
               </div>
            </div>

            {/* Chat panel */}
            <div className="flex-1 hidden lg:flex flex-col">
               {selectedChat ? (
                  <div className="flex-1 flex flex-col overflow-hidden p-4">
                     <ChatPanel
                        eventId={selectedChat.event_id}
                        eventName={selectedChat.event_title}
                        eventEmoji={selectedChat.event_emoji}
                        attendeeId={selectedChat.attendee_id}
                        displayName={user?.email?.split('@')[0] || 'You'}
                     />
                  </div>
               ) : (
                  <div className="flex items-center justify-center h-full text-muted text-sm">
                     Select a chat to start messaging
                  </div>
               )}
            </div>
         </main>

         {showAuthModal && <AuthModal onClose={() => setShowAuthModal(false)} />}
      </div>
   )
}
