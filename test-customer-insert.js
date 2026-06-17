const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const email = `test-${Date.now()}@example.com`;
  
  const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
    email,
    password: 'password123',
    email_confirm: true,
  });
  
  if (authError) {
    console.error("Auth error:", authError);
    return;
  }
  
  console.log("Created user:", authUser.user.id);
  
  // wait 500ms
  await new Promise(r => setTimeout(r, 500));
  
  const { data: customer, error: customerError } = await supabase
    .from('customers')
    .insert({
      profile_id: authUser.user.id,
      full_name: 'Test User',
      email: email,
      phone: '1234567890',
      address_line1: '123 Test St',
      notes: JSON.stringify({ is_onboarded: true }),
      is_active: true
    })
    .select()
    .single();
    
  if (customerError) {
    console.error("Customer insert error:", customerError);
  } else {
    console.log("Customer created successfully:", customer.id);
  }
}
run();
