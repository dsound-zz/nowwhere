'use client'

import { useState } from 'react'
import { getOpenMojiUrl } from '@/lib/emoji'

interface EmojiProps {
   emoji: string // Native emoji character e.g. "🎷"
   size?: number // px, defaults to 24
   className?: string
   alt?: string
}

/**
 * Emoji component that renders OpenMoji SVGs with native emoji fallback
 */
export function Emoji({ emoji, size = 28, className = '', alt }: EmojiProps) {
   const [useFallback, setUseFallback] = useState(false)

   // If OpenMoji fails to load, show native emoji
   if (useFallback) {
      return (
         <span
            className={`inline-block ${className}`}
            style={{ fontSize: `${size}px`, lineHeight: 1 }}
            role="img"
            aria-label={alt || emoji}
         >
            {emoji}
         </span>
      )
   }

   return (
      <img
         src={getOpenMojiUrl(emoji)}
         alt={alt || emoji}
         width={size}
         height={size}
         className={`inline-block ${className}`}
         style={{ verticalAlign: 'middle' }}
         loading="lazy"
         draggable={false}
         onError={() => setUseFallback(true)}
      />
   )
}
