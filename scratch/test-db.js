
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: '.env.local' });

async function test() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('Missing env vars');
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  console.log('Testing leads table...');
  const { data: leads, error: leadsError } = await supabase.from('leads').select('*').limit(1);
  if (leadsError) {
    console.error('Leads error:', leadsError);
  } else {
    console.log('Leads success, columns:', Object.keys(leads[0] || {}));
  }

  console.log('Testing jobs table...');
  const { data: jobs, error: jobsError } = await supabase.from('jobs').select('*').limit(1);
  if (jobsError) {
    console.error('Jobs error:', jobsError);
  } else {
    console.log('Jobs success, columns:', Object.keys(jobs[0] || {}));
  }
}

test();
