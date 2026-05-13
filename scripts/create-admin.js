const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

// Parse .env.local
const envFile = fs.readFileSync('.env.local', 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
        env[match[1]] = match[2];
    }
});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing Supabase credentials in .env.local");
  process.exit(1);
}

const ws = require('ws');

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  },
  realtime: {
    transport: ws
  }
});

async function createAdmin() {
  const email = "malikjcampbell05@gmail.com";
  const password = "SOBtest123";

  // Create auth user
  console.log(`Creating auth user for ${email}...`);
  const { data: userAuth, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email: email,
    password: password,
    email_confirm: true // bypass email confirmation
  });

  if (authError) {
    if (authError.message.includes("already exists") || authError.message.includes("already registered")) {
        console.log(`User ${email} already exists in Auth. Looking up ID...`);
        // If they already exist, we need to update their profile
        // Let's get the user ID
        const { data: users, error: listError } = await supabaseAdmin.auth.admin.listUsers();
        if (listError) throw listError;
        
        const existingUser = users.users.find(u => u.email === email);
        if (existingUser) {
            await ensureProfileIsAdmin(existingUser.id, email);
            
            // Wait, what if they want to login with the password?
            // If they are already registered, we should probably force update the password
            console.log(`Updating password to SOBtest123...`);
            await supabaseAdmin.auth.admin.updateUserById(existingUser.id, { password: password });
        } else {
            console.error("Could not find user in list");
        }
        return;
    }
    console.error("Auth Error:", authError);
    return;
  }

  const userId = userAuth.user.id;
  console.log(`User created with ID: ${userId}`);

  await ensureProfileIsAdmin(userId, email);
}

async function ensureProfileIsAdmin(userId, email) {
    console.log(`Ensuring profile for ${userId} is admin...`);
    
    // Check if profile exists
    const { data: existingProfile } = await supabaseAdmin
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
        
    if (existingProfile) {
        // Update to admin
        const { error: updateError } = await supabaseAdmin
            .from('profiles')
            .update({ role: 'admin', full_name: 'Malik Campbell' })
            .eq('id', userId);
            
        if (updateError) {
            console.error("Error updating profile:", updateError);
        } else {
            console.log(`Successfully updated ${email} to Admin!`);
        }
    } else {
        // Insert new profile
        const { error: insertError } = await supabaseAdmin
            .from('profiles')
            .insert({
                id: userId,
                email: email,
                role: 'admin',
                full_name: 'Malik Campbell'
            });
            
        if (insertError) {
            console.error("Error inserting profile:", insertError);
        } else {
            console.log(`Successfully created Admin profile for ${email}!`);
        }
    }
}

createAdmin().catch(console.error);
