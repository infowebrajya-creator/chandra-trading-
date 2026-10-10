import { createServerClient } from "@supabase/ssr";

const supabaseUrl = 
  (typeof process !== 'undefined' && process.env && process.env.NEXT_PUBLIC_SUPABASE_URL) ||
  (typeof import.meta !== 'undefined' && import.meta && import.meta.env && import.meta.env.VITE_SUPABASE_URL) ||
  "https://gosfoxsylrapazhoorwu.supabase.co";

const supabaseKey = 
  (typeof process !== 'undefined' && process.env && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) ||
  (typeof import.meta !== 'undefined' && import.meta && import.meta.env && import.meta.env.VITE_SUPABASE_ANON_KEY) ||
  "sb_publishable_venHPzDM2FsTpd8U2P_dOA_RSnXc1Ne";

export const createClient = (request: any) => {
  let supabaseResponse = {
    headers: new Map(),
    cookies: new Map()
  };

  const supabase = createServerClient(
    supabaseUrl!,
    supabaseKey!,
    {
      cookies: {
        getAll() {
          return request?.cookies?.getAll ? request.cookies.getAll() : []
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request?.cookies?.set?.(name, value))
          cookiesToSet.forEach(({ name, value }) =>
            supabaseResponse.cookies.set(name, value)
          )
        },
      },
    },
  );

  return { supabaseResponse, supabase };
};
