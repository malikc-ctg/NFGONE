const { createClient } = require('@supabase/supabase-js');
const ws = require('ws');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { autoRefreshToken: false, persistSession: false },
  realtime: { transport: ws }
});

async function run() {
  const email = `test-${Date.now()}@example.com`;
  
  console.log('1. Creating auth user:', email);
  const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
    email,
    password: 'password123',
    email_confirm: true,
    user_metadata: { role: 'customer', full_name: 'Test User' },
  });
  
  if (authError) {
    console.error('Auth Error:', authError);
    return;
  }
  
  console.log('2. Upsert profile...');
  const { error: profileError } = await supabase.from('profiles').upsert({
    id: authUser.user.id,
    email: email,
    full_name: 'Test User',
    phone: '555-555-5555',
    role: 'customer'
  });
  if (profileError) console.error('Profile Error:', profileError);
  
  console.log('3. Check zone...');
  const { data: zone } = await supabase.from('zones').select('id').limit(1).single();
  
  console.log('4. Inserting customer record...');
  const { data: customer, error: customerError } = await supabase
    .from('customers')
    .insert({
      profile_id: authUser.user.id,
      full_name: 'Test User',
      email: email,
      phone: '555-555-5555',
      address_line1: '123 Test St',
      city: 'Test City',
      postal_code: '12345',
      zone_id: zone?.id,
      notes: JSON.stringify({ is_onboarded: true }),
      is_active: true
    })
    .select();
    
  if (customerError) {
    console.error('Customer Insert Error:', customerError);
  } else {
    console.log('Customer Insert Success:', customer);
  }
}
run();
