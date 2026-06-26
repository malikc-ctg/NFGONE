global.WebSocket = require('ws');
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

async function main() {
  const { data, error } = await supabase.from('jobs').select('id, scheduled_date');
  console.log("All Jobs dates:", data.map(j => j.scheduled_date));
}
main();
