import { createBrowserClient } from '@supabase/ssr'

type AnyClient = ReturnType<typeof createBrowserClient>

export function createClient(): AnyClient {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}