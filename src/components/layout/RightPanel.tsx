'use client'

import { useState } from 'react'

interface RightPanelProps {
   chatPanel?: React.ReactNode
   venuePanel?: React.ReactNode
   isOpen?: boolean
   onClose?: () => void
}

export function RightPanel({ chatPanel, venuePanel, isOpen, onClose }: RightPanelProps) {
   const [activeTab, setActiveTab] = useState<'chat' | 'venue'>('chat')

   return (
      <aside className={`shrink-0 bg-surface flex-col overflow-hidden fixed inset-0 z-50 w-full lg:relative lg:w-[300px] lg:border-l lg:border-border lg:z-auto ${isOpen ? 'flex' : 'hidden lg:flex'}`}>
         <div className="flex border-b border-border relative">
            {onClose && (
               <button 
                  onClick={onClose}
                  className="lg:hidden absolute left-4 top-1/2 -translate-y-1/2 p-1.5 text-muted hover:text-text z-10"
                  aria-label="Close panel"
               >
                  <svg viewBox="0 0 24 24" className="w-5 h-5 stroke-current fill-none strokeWidth-2 strokeLinecap-round strokeLinejoin-round">
                     <path d="M15 18l-6-6 6-6" />
                  </svg>
               </button>
            )}
            <button
               onClick={() => setActiveTab('chat')}
               className={`flex-1 py-3.5 text-xs font-medium cursor-pointer text-center border-b-2 transition-colors ${activeTab === 'chat'
                  ? 'text-teal border-b-teal'
                  : 'text-muted border-b-transparent'
                  }`}
            >
               Event chat
            </button>
            <button
               onClick={() => setActiveTab('venue')}
               className={`flex-1 py-3.5 text-xs font-medium cursor-pointer text-center border-b-2 transition-colors ${activeTab === 'venue'
                  ? 'text-teal border-b-teal'
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