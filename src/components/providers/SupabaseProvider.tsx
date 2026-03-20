'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'

// Local storage key for anonymous user display name
const ANON_DISPLAY_NAME_KEY = 'nowhere_anon_display_name'

interface AuthContextType {
   user: User | null
   loading: boolean
   signIn: (email: string) => Promise<void>
   signInAnonymously: (displayName?: string) => Promise<User | null>
   signOut: () => Promise<void>
   getAnonDisplayName: () => string | null
   setAnonDisplayName: (name: string) => void
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

   // FR-5 & FR-11: Anonymous sign-in for "First L." format users
   const signInAnonymously = async (displayName?: string): Promise<User | null> => {
      const { data, error } = await supabase.auth.signInAnonymously()

      if (error) throw error

      // Store display name in localStorage and user metadata
      if (data.user && displayName) {
         setAnonDisplayName(displayName)

         // Update user metadata with display name
         await supabase.auth.updateUser({
            data: { display_name: displayName }
         })
      }

      return data.user
   }

   const signOut = async () => {
      const { error } = await supabase.auth.signOut()
      if (error) throw error
      setUser(null)
      // Clear anon display name on sign out
      localStorage.removeItem(ANON_DISPLAY_NAME_KEY)
   }

   // Get stored anonymous display name
   const getAnonDisplayName = (): string | null => {
      return localStorage.getItem(ANON_DISPLAY_NAME_KEY)
   }

   // Store display name for anonymous users
   const setAnonDisplayName = (name: string) => {
      localStorage.setItem(ANON_DISPLAY_NAME_KEY, name)
   }

   return (
      <AuthContext.Provider value={{
         user,
         loading,
         signIn,
         signInAnonymously,
         signOut,
         getAnonDisplayName,
         setAnonDisplayName
      }}>
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