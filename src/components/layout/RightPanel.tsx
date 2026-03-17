'use client'

import { useState } from 'react'

interface RightPanelProps {
   chatPanel?: React.ReactNode
   venuePanel?: React.ReactNode
}

export function RightPanel({ chatPanel, venuePanel }: RightPanelProps) {
   const [activeTab, setActiveTab] = useState<'chat' | 'venue'>('chat')

   return (
      <aside className="w-[300px] shrink-0 border-l border-border bg-surface flex flex-col overflow-hidden hidden lg:flex">
         <div className="flex border-b border-border">
            <button
               onClick={() => setActiveTab('chat')}
               className={`flex-1 py-3.5 text-xs font-medium cursor-pointer text-center border-b-2 transition-colors ${activeTab === 'chat'
                  ? 'text-purple border-b-purple'
                  : 'text-muted border-b-transparent'
                  }`}
            >
               Event chat
            </button>
            <button
               onClick={() => setActiveTab('venue')}
               className={`flex-1 py-3.5 text-xs font-medium cursor-pointer text-center border-b-2 transition-colors ${activeTab === 'venue'
                  ? 'text-purple border-b-purple'
                  : 'text-muted border-b-transparent'
                  }`}
            >
               Venues
            </button>
         </div>

         <div className="flex-1 overflow-y-auto p-4">
            {activeTab === 'chat' && chatPanel}
            {activeTab === 'venue' && venuePanel}
         </div>
      </aside>
   )
}