const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const { WebSocket } = require('ws');

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  },
  global: {
    // For Node 18+, native fetch works, otherwise we use node-fetch
    fetch: global.fetch || ((...args) => import('node-fetch').then(({default: fetch}) => fetch(...args)))
  },
  realtime: {
    transport: WebSocket
  }
});

async function createContractor(email, password, fullName) {
  console.log(`Creating contractor account for ${email}...`);

  try {
    // 1. Create auth user
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { role: 'contractor', full_name: fullName }
    });

    if (authError) throw authError;

    const userId = authData.user.id;
    console.log('Auth user created:', userId);

    // 2. Create profile
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert({
        id: userId,
        email,
        full_name: fullName,
        role: 'contractor'
      });

    if (profileError) throw profileError;
    console.log('Profile created');

    // 3. Create contractor record
    const { error: contractorError } = await supabase
      .from('contractors')
      .upsert({
        profile_id: userId,
        full_name: fullName,
        email,
        phone: '555-0101',
        tier: 'pro',
        status: 'active',
        payout_rate: 0.75,
        has_vehicle: true,
        brings_own_supplies: true
      });

    if (contractorError) throw contractorError;
    console.log('Contractor record created successfully!');
  } catch (err) {
    console.error('Operation failed:', err.message);
  }
}

const email = 'kxngmalik17@gmail.com';
const password = 'SOBtest123';
const fullName = 'Malik Contractor';

createContractor(email, password, fullName);
