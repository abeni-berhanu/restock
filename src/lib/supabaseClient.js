import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase env vars. Copy .env.example to .env.local and fill in your project URL and anon key.'
  )
}

// One shared client for the whole app. Never create a second instance —
// auth session state lives on this object.
export const supabase = createClient(supabaseUrl, supabaseAnonKey)
