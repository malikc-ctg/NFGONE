global.WebSocket = require('ws');
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

async function main() {
  const { error } = await supabase.rpc('refresh_zone_monthly_pnl');
  if (error) {
    console.error("Refresh Error:", error);
  } else {
    console.log("Refresh successful");
    const { data } = await supabase.from('zone_monthly_pnl').select('*');
    console.log("Data:", data);
  }
}
main();
