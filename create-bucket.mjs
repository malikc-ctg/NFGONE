import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
async function run() {
  const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/bucket`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ id: 'documents', name: 'documents', public: true })
  });
  const data = await res.json();
  console.log(data);
}
run();
