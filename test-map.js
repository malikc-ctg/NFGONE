const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  const { data, error } = await supabase.from('contractors').select('id, full_name, status, notes').eq('status', 'active');
  if (error) console.error(error);
  else {
    console.log(JSON.stringify(data, null, 2));
  }
}
test();
