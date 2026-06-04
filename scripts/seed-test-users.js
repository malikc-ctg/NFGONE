require('dotenv').config({ path: '.env.local' });
global.WebSocket = require('ws');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

async function createTestUsers() {
  const users = [
    { email: 'admin@seaofblue.app', password: 'SOBtest123', role: 'admin', name: 'Test Admin' },
    { email: 'contractor@seaofblue.app', password: 'SOBtest123', role: 'contractor', name: 'Test Contractor' }
  ];

  for (const u of users) {
    console.log(`Creating ${u.email}...`);
    
    // First check if user exists
    let userId;
    const { data: listData } = await supabase.auth.admin.listUsers();
    const existingUser = listData.users.find(user => user.email === u.email);

    if (existingUser) {
        console.log(`User ${u.email} already exists. Updating password...`);
        userId = existingUser.id;
        const { error: updateError } = await supabase.auth.admin.updateUserById(userId, {
            password: u.password,
            email_confirm: true
        });
        if (updateError) console.error('Error updating password:', updateError);
    } else {
        const { data: authData, error: authError } = await supabase.auth.admin.createUser({
          email: u.email,
          password: u.password,
          email_confirm: true,
        });

        if (authError) {
             console.error('Error creating auth user:', authError);
             continue;
        }
        userId = authData.user.id;
    }

    console.log(`Setting up profile for ${userId}...`);

    const { error: profileError } = await supabase.from('profiles').upsert({
      id: userId,
      role: u.role,
      full_name: u.name,
      email: u.email
    });

    if (profileError) {
      console.error('Error creating profile:', profileError);
    }
    
    if (u.role === 'contractor') {
       // Check if contractor exists
       const { data: existingContractor } = await supabase.from('contractors').select('id').eq('profile_id', userId).single();
       if (!existingContractor) {
           const { error: contractorError } = await supabase.from('contractors').insert({
             profile_id: userId,
             full_name: u.name,
             email: u.email,
             phone: '555-555-5555'
           });
           if (contractorError) {
               console.error('Error creating contractor row:', contractorError);
           }
       }
    }
  }
  console.log('Done!');
}

createTestUsers();
