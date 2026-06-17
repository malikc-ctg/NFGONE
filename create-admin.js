global.WebSocket = require('ws');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } }
);

async function setup() {
  const email = 'malik@seaofblue.app';
  const pw = 'SOBtest123';
  console.log(`Setting up Admin: ${email}`);
  
  const { data: adminAuth, error: authError } = await supabase.auth.admin.createUser({ 
    email: email, 
    password: pw, 
    email_confirm: true 
  });
  
  if (authError) {
    if (authError.message.includes('already registered')) {
        console.log("User already exists in Auth. Updating password and role...");
        // Fetch existing user to update
        const { data: existingUsers } = await supabase.auth.admin.listUsers();
        const user = existingUsers.users.find(u => u.email === email);
        if (user) {
            await supabase.auth.admin.updateUserById(user.id, { password: pw, email_confirm: true });
            await supabase.from('profiles').upsert({ id: user.id, email: email, role: 'admin', full_name: 'Malik Campbell' });
            console.log("Account updated successfully.");
        }
    } else {
        console.error("Auth Error:", authError);
    }
  } else if (adminAuth.user) {
    await supabase.from('profiles').upsert({ id: adminAuth.user.id, email: email, role: 'admin', full_name: 'Malik Campbell' });
    console.log("Account created successfully!");
  }
}
setup().catch(console.error);
