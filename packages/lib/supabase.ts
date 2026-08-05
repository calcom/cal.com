import { createClient } from '@supabase/supabase-js';

// Cliente para ser usado em Client Components ou onde apenas os privilégios anónimos são precisos
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://dummy.supabase.co',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || 'dummy'
);

// Cliente Admin para ser usado NO SERVIDOR (ex: NextAuth, tRPC middlewares) para saltar o RLS e sincronizar dados
export const createSupabaseAdmin = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  {
    auth: {
      persistSession: false,
    }
  }
);
