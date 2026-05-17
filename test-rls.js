import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
// 1. Log in with the user's credentials or create a JWT.
// Wait, I can't log in because I don't know the password. It was an invite!
// I can use the service role key to generate a custom JWT or use auth.admin to sign in?
