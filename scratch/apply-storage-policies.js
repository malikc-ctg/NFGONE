const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');
const ws = require('ws');

// Parse .env.local
const env = {};
fs.readFileSync('.env.local', 'utf8').split('\n').forEach(line => {
  const m = line.match(/^([^#][^=]+)=(.*)$/);
  if (m) env[m[1].trim()] = m[2].trim();
});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
  realtime: { transport: ws }
});

async function applyPolicy(name, sql) {
  console.log(`Applying: ${name}...`);
  // Use Supabase's admin SQL endpoint
  const url = `${env.NEXT_PUBLIC_SUPABASE_URL}/pg/query`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'apikey': env.SUPABASE_SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: sql }),
  });
  const body = await res.text();
  if (!res.ok) {
    console.error(`  ✗ ${res.status}: ${body}`);
  } else {
    console.log(`  ✓ Applied`);
  }
}

async function run() {
  await applyPolicy('drop admin policy', `DROP POLICY IF EXISTS "Admins have full access to storage" ON storage.objects`);
  await applyPolicy('create admin policy', `
    CREATE POLICY "Admins have full access to storage" ON storage.objects FOR ALL USING (
      EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    )
  `);
  await applyPolicy('drop insert policy', `DROP POLICY IF EXISTS "Authenticated users can insert documents" ON storage.objects`);
  await applyPolicy('create insert policy', `
    CREATE POLICY "Authenticated users can insert documents" ON storage.objects FOR INSERT WITH CHECK (
      bucket_id = 'documents' AND auth.role() = 'authenticated'
    )
  `);
  await applyPolicy('drop select policy', `DROP POLICY IF EXISTS "Authenticated users can select documents" ON storage.objects`);
  await applyPolicy('create select policy', `
    CREATE POLICY "Authenticated users can select documents" ON storage.objects FOR SELECT USING (
      bucket_id = 'documents' AND auth.role() = 'authenticated'
    )
  `);
  console.log('\nDone.');
}

run().catch(console.error);
