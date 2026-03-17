'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'

interface AuthContextType {
   user: User | null
   loading: boolean
   signIn: (email: string) => Promise<void>
   signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
   const [user, setUser] = useState<User | null>(null)
   const [loading, setLoading] = useState(true)
   const supabase = createClient()

   useEffect(() => {
      // Get initial session
      supabase.auth.getSession().then(({ data: { session } }) => {
         setUser(session?.user ?? null)
         setLoading(false)
      })

      // Listen for auth changes
      const { data: { subscription } } = supabase.auth.onAuthStateChange(
         (_event, session) => {
            setUser(session?.user ?? null)
         }
      )

      return () => {
         subscription.unsubscribe()
      }
   }, [supabase])

   const signIn = async (email: string) => {
      const { error } = await supabase.auth.signInWithOtp({
         email,
         options: {
            emailRedirectTo: `${window.location.origin}/auth/callback`,
         },
      })

      if (error) throw error
   }

   const signOut = async () => {
      const { error } = await supabase.auth.signOut()
      if (error) throw error
      setUser(null)
   }

   return (
      <AuthContext.Provider value={{ user, loading, signIn, signOut }}>
         {children}
      </AuthContext.Provider>
   )
}

export function useAuth() {
   const context = useContext(AuthContext)
   if (context === undefined) {
      throw new Error('useAuth must be used within an AuthProvider')
   }
   return context
}