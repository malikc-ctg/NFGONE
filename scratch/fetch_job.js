global.WebSocket = require('ws');
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function main() {
  const { data, error } = await supabase
    .from('jobs')
    .select('*, customer:customers(*), contractor:contractors(*), zone:zones(*)')
    .eq('id', '94e8c6c1-a783-441b-91e6-420aaf225892')
    .single();
  
  if (error) {
    console.error("Error:", error);
  } else {
    console.log("Job data:", JSON.stringify(data, null, 2));
  }
}
main();
