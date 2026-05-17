import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
async function check() {
  const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/contractors?select=*,zone:zones!contractors_zone_id_fkey(*)&profile_id=eq.dcb08066-20a1-4b9d-a135-5ff8bc45dbed`;
  const res = await fetch(url, {
    headers: {
      'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`
    }
  });
  console.log(await res.json());
}
check();
