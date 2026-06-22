require('dotenv').config({ path: '.env.local' });
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function clean() {
  const res = await fetch(`${supabaseUrl}/rest/v1/zones?select=id,name,created_at&order=created_at.asc`, {
    headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` }
  });
  const zones = await res.json();

  const seen = new Set();
  const toDelete = [];

  for (const z of zones) {
    if (seen.has(z.name)) {
      toDelete.push(z.id);
      console.log(`Duplicate found: ${z.name} (${z.id})`);
    } else {
      seen.add(z.name);
      console.log(`Keeping: ${z.name} (${z.id})`);
    }
  }

  if (toDelete.length > 0) {
    console.log(`Deleting ${toDelete.length} duplicates...`);
    for (const id of toDelete) {
        await fetch(`${supabaseUrl}/rest/v1/zones?id=eq.${id}`, {
            method: 'DELETE',
            headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` }
        });
    }
    console.log("Cleanup complete!");
  } else {
    console.log("No duplicates found.");
  }
}
clean();
