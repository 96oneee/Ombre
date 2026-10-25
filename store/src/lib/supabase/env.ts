/** True when the Supabase keys are set. Without them the storefront runs on the demo data in lib/demo.ts. */
export const hasSupabase = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
