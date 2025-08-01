// This file is automatically generated. Do not edit it directly.
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = "https://lzssqygnetvznmfubwmr.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx6c3NxeWduZXR2em5tZnVid21yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI0NTU5NTAsImV4cCI6MjA2ODAzMTk1MH0.9cdpPSRYspKvbDAlCsnzczuJmUW7D-4tJIkVVf6vnok";

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  }
});