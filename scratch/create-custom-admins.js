const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');
const ws = require('ws');

// Parse .env.local
const envFile = fs.readFileSync('.env.local', 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
        env[match[1]] = match[2].trim();
    }
});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing Supabase credentials in .env.local");
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  },
  realtime: {
    transport: ws
  }
});

const admins = [
  { email: "ayaanb132@gmail.com", name: "Ayaan B" },
  { email: "Raahimahmed1005@gmail.com", name: "Raahim Ahmed" }
];

async function createAdmin(email, fullName) {
  const password = "SOBtest123";

  console.log(`Creating auth user for ${email}...`);
  const { data: userAuth, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email: email,
    password: password,
    email_confirm: true
  });

  if (authError) {
    if (authError.message.includes("already exists") || authError.message.includes("already registered")) {
        console.log(`User ${email} already exists in Auth. Looking up ID...`);
        const { data: users, error: listError } = await supabaseAdmin.auth.admin.listUsers();
        if (listError) throw listError;
        
        const existingUser = users.users.find(u => u.email.toLowerCase() === email.toLowerCase());
        if (existingUser) {
            await ensureProfileIsAdmin(existingUser.id, email, fullName);
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
  await ensureProfileIsAdmin(userId, email, fullName);
}

async function ensureProfileIsAdmin(userId, email, fullName) {
    console.log(`Ensuring profile for ${userId} is admin...`);
    
    const { data: existingProfile } = await supabaseAdmin
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
        
    if (existingProfile) {
        const { error: updateError } = await supabaseAdmin
            .from('profiles')
            .update({ role: 'admin', full_name: fullName })
            .eq('id', userId);
            
        if (updateError) {
            console.error("Error updating profile:", updateError);
        } else {
            console.log(`Successfully updated ${email} to Admin!`);
        }
    } else {
        const { error: insertError } = await supabaseAdmin
            .from('profiles')
            .insert({
                id: userId,
                email: email,
                role: 'admin',
                full_name: fullName
            });
            
        if (insertError) {
            console.error("Error inserting profile:", insertError);
        } else {
            console.log(`Successfully created Admin profile for ${email}!`);
        }
    }
}

async function run() {
  for (const admin of admins) {
    await createAdmin(admin.email, admin.name);
    console.log('---');
  }
}

run().catch(console.error);
