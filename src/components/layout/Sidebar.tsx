'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'

const navItems = [
   { href: '/', icon: 'home', label: 'Feed' },
   { href: '/map', icon: 'map', label: 'Map' },
   { href: '/my-events', icon: 'calendar', label: 'My events' },
   { href: '/chats', icon: 'chat', label: 'Chats' },
]

const icons: Record<string, React.ReactNode> = {
   home: (
      <svg viewBox="0 0 24 24" className="w-5 h-5 stroke-current fill-none strokeWidth-[1.8] strokeLinecap-round strokeLinejoin-round">
         <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
         <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
   ),
   map: (
      <svg viewBox="0 0 24 24" className="w-5 h-5 stroke-current fill-none strokeWidth-[1.8] strokeLinecap-round strokeLinejoin-round">
         <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" />
         <line x1="8" y1="2" x2="8" y2="18" />
         <line x1="16" y1="6" x2="16" y2="22" />
      </svg>
   ),
   calendar: (
      <svg viewBox="0 0 24 24" className="w-5 h-5 stroke-current fill-none strokeWidth-[1.8] strokeLinecap-round strokeLinejoin-round">
         <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
         <line x1="16" y1="2" x2="16" y2="6" />
         <line x1="8" y1="2" x2="8" y2="6" />
         <line x1="3" y1="10" x2="21" y2="10" />
      </svg>
   ),
   chat: (
      <svg viewBox="0 0 24 24" className="w-5 h-5 stroke-current fill-none strokeWidth-[1.8] strokeLinecap-round strokeLinejoin-round">
         <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
   ),
   settings: (
      <svg viewBox="0 0 24 24" className="w-5 h-5 stroke-current fill-none strokeWidth-[1.8] strokeLinecap-round strokeLinejoin-round">
         <circle cx="12" cy="12" r="3" />
         <path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14" />
      </svg>
   ),
}

export function Sidebar() {
   const pathname = usePathname()

   return (
      <aside className="w-[68px] bg-surface border-r border-border flex flex-col items-center py-5 gap-1.5 shrink-0">
         <div className="font-display font-extrabold text-lg text-purple tracking-[-1px] mb-6 [writing-mode:vertical-lr] rotate-180">
            NW
         </div>

         {navItems.map((item) => (
            <Link
               key={item.href}
               href={item.href}
               className={`w-11 h-11 rounded-xl flex items-center justify-center cursor-pointer transition-all duration-150 ${pathname === item.href
                     ? 'bg-purple-dim text-purple'
                     : 'text-muted hover:bg-surface2 hover:text-text'
                  }`}
               title={item.label}
            >
               {icons[item.icon]}
            </Link>
         ))}

         <div className="mt-auto flex flex-col items-center gap-1.5">
            <Link
               href="/settings"
               className="w-11 h-11 rounded-xl flex items-center justify-center cursor-pointer text-muted hover:bg-surface2 hover:text-text transition-all duration-150"
               title="Settings"
            >
               {icons.settings}
            </Link>
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple to-blue flex items-center justify-center font-display font-bold text-[13px] text-white cursor-pointer mt-2">
               ?
            </div>
         </div>
      </aside>
   )
}