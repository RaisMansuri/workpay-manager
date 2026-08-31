import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import ws from 'ws';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const envPath = path.resolve(__dirname, '../../.env');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
}

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

console.log('🔄 Checking Supabase PostgreSQL database table status...');

if (!supabaseUrl || !supabaseKey) {
  console.log('⚠️ Supabase credentials not fully set in .env. Skipping auto migration check.');
  process.exit(0);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  global: {
    fetch: globalThis.fetch
  },
  auth: { persistSession: false },
  realtime: {
    transport: ws
  }
});

async function checkAndMigrate() {
  try {
    const { data, error } = await supabase
      .from('customer_records')
      .select('id')
      .limit(1);

    if (!error) {
      console.log('✅ Connected to live Supabase PostgreSQL! Table customer_records is ready.');
      process.exit(0);
    }

    if (error.code === 'PGRST205' || error.message?.includes('customer_records')) {
      console.log('ℹ️ Table customer_records not found in schema cache.');
      console.log('📌 Please run supabase_schema.sql once in Supabase SQL Editor:');
      console.log(`   https://supabase.com/dashboard/project/nqnyhqkwskvkstpqjvkv/editor`);
    } else {
      console.log('ℹ️ Supabase response:', error.message);
    }
  } catch (err) {
    console.error('Migration check notice:', err.message);
  }
}

checkAndMigrate();
