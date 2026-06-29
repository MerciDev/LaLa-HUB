import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env['SUPABASE_URL'] || ''
const SUPABASE_ANON_KEY = process.env['SUPABASE_ANON_KEY'] || ''

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error("Missing supabase env vars");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

async function test() {
  const { data: pt } = await supabase.from('playtime').select('*');
  console.log("PLAYTIME:", pt);

  const ids = Array.from(new Set(pt?.map(p => p.slot_id).filter(Boolean)));
  console.log("Unique Playtime slot_ids:", ids);
  
  const { data: gm } = await supabase.from('games').select('*').in('id', ids);
  console.log("GAMES found by slot_ids:", gm);

  const { data: gmslug } = await supabase.from('games').select('*').like('id', '%cyber%');
  console.log("GAMES like cyber:", gmslug);

  const { data: gmName } = await supabase.from('games').select('*').like('name', '%Cyber%');
  console.log("GAMES like name Cyber:", gmName);
}
test();
