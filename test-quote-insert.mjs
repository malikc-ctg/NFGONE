import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { readFileSync } from 'fs';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { autoRefreshToken: false, persistSession: false }
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
  
  console.log('User created:', authUser.user.id);
  
  console.log('Waiting 1s for trigger...');
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  console.log('2. Inserting customer record...');
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
