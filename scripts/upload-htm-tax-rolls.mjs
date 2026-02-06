#!/usr/bin/env node
/**
 * Bulk upload .htm files to Supabase tax_rolls_by_assessment bucket.
 *
 * Usage:
 *   node scripts/upload-htm-tax-rolls.mjs [source-dir]
 *
 * Default source dir: ./htm-tax-rolls
 *
 * Requires: Run migration 20250206300000_allow_html_tax_rolls_bucket.sql first.
 * Loads VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY from ./env (or .env).
 * For uploads (RLS), add SUPABASE_SERVICE_ROLE_KEY to env (Supabase Dashboard > Settings > API).
 */
import { createClient } from '@supabase/supabase-js';
import { readdir, readFile } from 'fs/promises';
import { readFileSync, existsSync } from 'fs';
import { join, relative, resolve } from 'path';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, '..');

function loadEnv() {
  const envPath = join(rootDir, 'env');
  const altPath = join(rootDir, '.env');
  const path = existsSync(envPath) ? envPath : existsSync(altPath) ? altPath : null;
  if (!path) {
    console.error('No env or .env file found. Create one with VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY (or SUPABASE_SERVICE_ROLE_KEY).');
    process.exit(1);
  }
  const content = readFileSync(path, 'utf8');
  const env = { ...process.env };
  for (const line of content.split(/\r?\n/)) {
    const m = line.match(/^([^=]+)=(.*)$/);
    if (m) env[m[1].trim()] = m[2].trim();
  }
  return env;
}

async function* walkHtm(dir, base = dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = join(dir, e.name);
    const rel = relative(base, full);
    if (e.isDirectory()) {
      yield* walkHtm(full, base);
    } else if (e.isFile() && (e.name.endsWith('.htm') || e.name.endsWith('.html'))) {
      yield { full, rel };
    }
  }
}

async function main() {
  const sourceDir = process.argv[2]
    ? resolve(process.cwd(), process.argv[2])
    : join(rootDir, 'htm-tax-rolls');

  if (!existsSync(sourceDir)) {
    console.error('Source directory not found:', sourceDir);
    console.error('Usage: node scripts/upload-htm-tax-rolls.mjs [source-dir]');
    process.exit(1);
  }

  const env = loadEnv();
  const url = env.VITE_SUPABASE_URL;
  const key = env.SUPABASE_SERVICE_ROLE_KEY || env.VITE_SUPABASE_ANON_KEY;

  if (!url || !key) {
    console.error('Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY (or SUPABASE_SERVICE_ROLE_KEY) in env.');
    process.exit(1);
  }

  const supabase = createClient(url, key);
  const bucket = 'tax_rolls_by_assessment';

  let ok = 0;
  let fail = 0;

  for await (const { full, rel } of walkHtm(sourceDir)) {
    const body = await readFile(full);
    const { error } = await supabase.storage
      .from(bucket)
      .upload(rel.replace(/\\/g, '/'), body, { contentType: 'text/html', upsert: true });

    if (error) {
      console.error('FAIL:', rel, error.message);
      if (error.message.includes('row-level security') && !env.SUPABASE_SERVICE_ROLE_KEY) {
        console.error('  Tip: Add SUPABASE_SERVICE_ROLE_KEY to env for uploads (Supabase Dashboard > Settings > API).');
      }
      fail++;
    } else {
      console.log('OK:', rel);
      ok++;
    }
  }

  console.log('\nDone:', ok, 'uploaded', fail > 0 ? `, ${fail} failed` : '');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
