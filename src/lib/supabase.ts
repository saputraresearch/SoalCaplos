import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || supabaseAnonKey;

// Public client for browser / standard queries
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Admin service role client for privileged backend ops (uploads, bypass RLS if needed)
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
