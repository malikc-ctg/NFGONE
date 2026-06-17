const { createClient } = require('@supabase/supabase-js');
const ws = require('ws');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Use custom fetch or just pass ws? Supabase node client allows custom fetch, but actually for realtime we need ws
const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { autoRefreshToken: false, persistSession: false },
  global: { WebSocket: ws }
});

async function run() {
  const { data: users, error: uError } = await supabase.auth.admin.listUsers();
  if (uError) {
    console.error("Auth error:", uError);
    return;
  }
  
  const recentUsers = users.users.sort((a,b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 3);
  
  for (const u of recentUsers) {
    console.log(`\nUser: ${u.email} (ID: ${u.id})`);
    
    const { data: customer } = await supabase.from('customers').select('*').eq('profile_id', u.id).single();
    if (customer) {
      console.log(`  Customer exists!`);
      console.log(`  address_line1: "${customer.address_line1}"`);
      console.log(`  notes:`, customer.notes);
    } else {
      console.log(`  NO CUSTOMER ROW FOUND FOR THIS USER!`);
    }
  }
}
run();
