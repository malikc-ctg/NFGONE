global.WebSocket = require('ws');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } }
);

async function setup() {
  const pw = 'Password123!';
  console.log("Setting up Admin...");
  const { data: adminAuth } = await supabase.auth.admin.createUser({ email: 'admin-e2e@seaofblue.app', password: pw, email_confirm: true });
  if (adminAuth.user) await supabase.from('profiles').upsert({ id: adminAuth.user.id, email: 'admin-e2e@seaofblue.app', role: 'admin', full_name: 'Admin E2E' });

  console.log("Setting up Contractor...");
  const { data: contractorAuth } = await supabase.auth.admin.createUser({ email: 'contractor-e2e@seaofblue.app', password: pw, email_confirm: true });
  if (contractorAuth.user) {
    await supabase.from('profiles').upsert({ id: contractorAuth.user.id, email: 'contractor-e2e@seaofblue.app', role: 'contractor', full_name: 'Contractor E2E' });
    const { data: zone } = await supabase.from('zones').select('id').limit(1).single();
    await supabase.from('contractors').upsert({ profile_id: contractorAuth.user.id, email: 'contractor-e2e@seaofblue.app', full_name: 'Contractor E2E', phone: '555-555-5555', status: 'active', zone_id: zone?.id || null }, { onConflict: 'email' });
  }

  console.log("Setting up Customer...");
  const { data: customerAuth } = await supabase.auth.admin.createUser({ email: 'customer-e2e@seaofblue.app', password: pw, email_confirm: true });
  if (customerAuth.user) {
    await supabase.from('profiles').upsert({ id: customerAuth.user.id, email: 'customer-e2e@seaofblue.app', role: 'customer', full_name: 'Customer E2E' });
    await supabase.from('customers').upsert({ profile_id: customerAuth.user.id, email: 'customer-e2e@seaofblue.app', full_name: 'Customer E2E', phone: '555-555-5555' }, { onConflict: 'email' });
  }

  console.log("Done!");
}
setup().catch(console.error);
