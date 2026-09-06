import { createBrowserClient } from "@supabase/ssr";

/**
 * Supabase client for use in Client Components and browser-side code.
 * Do not use this in Server Components or Route Handlers.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );
}
