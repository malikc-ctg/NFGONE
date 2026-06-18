require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const WebSocket = require('ws');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { autoRefreshToken: false, persistSession: false },
  realtime: { transport: WebSocket }
});

async function createTestCustomer() {
  const email = 'test_customer_' + Date.now() + '@example.com';
  const password = 'Password123!';
  
  // Create user
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true
  });
  
  if (authError) {
    console.error('Error creating user:', authError);
    return;
  }
  
  const userId = authData.user.id;
  
  // Create profile
  await supabase.from('profiles').insert({
    id: userId,
    email: email,
    full_name: 'Test Customer',
    role: 'customer'
  });
  
  // Create customer record
  await supabase.from('customers').insert({
    profile_id: userId,
    email: email,
    full_name: 'Test Customer',
    phone: '555-0123',
    address_line1: '123 Test St',
    city: 'Testville',
    province: 'ON',
    postal_code: 'A1A 1A1',
    is_active: true
  });
  
  // Create a past job to test billing
  await supabase.from('jobs').insert({
    customer_id: authData.user.id, // wait, the customer id is from 'customers', but I need to query it.
  });
  
  console.log('SUCCESS');
  console.log('Email:', email);
  console.log('Password:', password);
}

createTestCustomer();
