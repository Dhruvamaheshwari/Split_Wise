import { createClient } from "@supabase/supabase-js";

// VITE_ environment variables will be available in the frontend
// You must set these in frontend/.env
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "https://placeholder-url.supabase.co";
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "placeholder-key";

export const supabase = createClient(supabaseUrl, supabaseKey);
