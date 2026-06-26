const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_ANON_KEY;

if (!url || !key) {
  console.log('Falta URL o KEY de Supabase');
  process.exit(1);
}

const supabase = createClient(url, key);

async function run() {
  console.log('Realizando peticion a games...');
  const { data, error } = await supabase.from('games').select('*').limit(5);
  if (error) {
    console.error('Error:', error);
  } else {
    console.log(`Encontrados ${data.length} juegos.`);
    data.forEach(g => console.log(`- ${g.name}`));
  }
}

run();
