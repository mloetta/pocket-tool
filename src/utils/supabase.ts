import { createClient } from '@supabase/supabase-js';
import env from './env.js';

export const supabase = createClient(env.get('supabase_url').toString(), env.get('supabase_api_key').toString());
