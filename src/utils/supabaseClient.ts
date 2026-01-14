import { createClient, type SupabaseClient } from "@supabase/supabase-js"

export const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
export const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""

if (typeof window !== "undefined" && typeof window.btoa === "function") {
  const originalBtoa = window.btoa.bind(window)
  window.btoa = (str: string) => {
    try {
      return originalBtoa(str)
    } catch (e) {
      // Fallback para strings UTF-8
      const bytes = new TextEncoder().encode(str)
      let binary = ""
      for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i])
      }
      return originalBtoa(binary)
    }
  }
}

let client: SupabaseClient

const mockError = { message: "Supabase not configured - please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY" }
const mockQueryBuilder = {
  select: () => mockQueryBuilder,
  insert: () => mockQueryBuilder,
  update: () => mockQueryBuilder,
  delete: () => mockQueryBuilder,
  eq: () => mockQueryBuilder,
  neq: () => mockQueryBuilder,
  gt: () => mockQueryBuilder,
  gte: () => mockQueryBuilder,
  lt: () => mockQueryBuilder,
  lte: () => mockQueryBuilder,
  like: () => mockQueryBuilder,
  ilike: () => mockQueryBuilder,
  is: () => mockQueryBuilder,
  in: () => mockQueryBuilder,
  contains: () => mockQueryBuilder,
  containedBy: () => mockQueryBuilder,
  range: () => mockQueryBuilder,
  order: () => mockQueryBuilder,
  limit: () => mockQueryBuilder,
  single: () => Promise.resolve({ data: null, error: mockError }),
  maybeSingle: () => Promise.resolve({ data: null, error: mockError }),
  then: (resolve: any) => resolve({ data: null, error: mockError }),
}
const createMockClient = (): SupabaseClient => ({
  from: () => mockQueryBuilder,
  auth: {
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
    signInWithPassword: () => Promise.resolve({ data: null, error: { message: "Supabase not configured" } }),
    signUp: () => Promise.resolve({ data: null, error: { message: "Supabase not configured" } }),
    signOut: () => Promise.resolve({ error: null }),
    getSession: () => Promise.resolve({ data: { session: null }, error: null }),
  },
} as unknown as SupabaseClient)

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn("Supabase credentials not configured. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY environment variables.")
  client = createMockClient()
} else {
  try {
    client = createClient(supabaseUrl, supabaseAnonKey, {
    db: {
      schema: "public",
    },
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
    global: {
      headers: { "x-app-version": "2.0.5" },
    },
  })
  } catch (error) {
    console.error("Erro FATAL ao inicializar Supabase:", error)
    client = createMockClient()
  }
}

export const supabase = client
