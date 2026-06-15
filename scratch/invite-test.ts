import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

// Load .env.local
dotenv.config({ path: resolve(process.cwd(), '.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
  const email = `test-${Date.now()}@example.com`;
  
  // Create profile so it doesn't fail onboarding
  const { data: user, error: inviteError } = await supabase.auth.admin.generateLink({
    type: 'invite',
    email,
    options: {
      data: { full_name: 'Test Onboard', phone: '1234567890' },
      redirectTo: 'http://localhost:3000/contractor/onboarding'
    }
  });

  if (inviteError) {
    console.error('Invite Error:', inviteError);
    return;
  }
  
  const authUserId = user.user.id;
  await supabase.from('profiles').upsert({ id: authUserId, email, role: 'contractor', full_name: 'Test Onboard' });
  await supabase.from('contractors').insert({ profile_id: authUserId, email, full_name: 'Test Onboard', status: 'invited' });

  console.log('Action Link:', user.properties.action_link);
}

main();
