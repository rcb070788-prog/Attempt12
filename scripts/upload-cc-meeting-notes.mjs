#!/usr/bin/env node
/**
 * Upload Concerned Citizens meeting note PDFs to Supabase cc_meeting_notes bucket.
 *
 * Usage:
 *   node scripts/upload-cc-meeting-notes.mjs [local-pdf-path]
 *
 * Default: ./Moore Transparency Concerned Citizens Presentation_02-05-2026.pdf
 * Storage key: 2026/Moore Transparency Concerned Citizens Presentation_02-05-2026.pdf
 *
 * Requires: Run migration 20250623130000_create_cc_meeting_notes_bucket.sql first.
 * Loads VITE_SUPABASE_URL from ./env (or .env).
 * For uploads (RLS), add SUPABASE_SERVICE_ROLE_KEY to env (Supabase Dashboard > Settings > API).
 */
import { createClient } from '@supabase/supabase-js';
import { readFile } from 'fs/promises';
import { readFileSync, existsSync } from 'fs';
import { basename, join, resolve } from 'path';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, '..');

const DEFAULT_FILE = 'Moore Transparency Concerned Citizens Presentation_02-05-2026.pdf';
const STORAGE_KEY = `2026/${DEFAULT_FILE}`;

function loadEnv() {
  const envPath = join(rootDir, 'env');
  const altPath = join(rootDir, '.env');
  const path = existsSync(envPath) ? envPath : existsSync(altPath) ? altPath : null;
  if (!path) {
    console.error('No env or .env file found. Create one with VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');
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

async function main() {
  const localPath = process.argv[2]
    ? resolve(process.cwd(), process.argv[2])
    : join(rootDir, DEFAULT_FILE);

  if (!existsSync(localPath)) {
    console.error('File not found:', localPath);
    console.error('Usage: node scripts/upload-cc-meeting-notes.mjs [local-pdf-path]');
    process.exit(1);
  }

  const env = loadEnv();
  const url = env.VITE_SUPABASE_URL;
  const key = env.SUPABASE_SERVICE_ROLE_KEY || env.VITE_SUPABASE_ANON_KEY;

  if (!url || !key) {
    console.error('Set VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in env.');
    process.exit(1);
  }

  const supabase = createClient(url, key);
  const bucket = 'cc_meeting_notes';
  const storagePath = basename(localPath) === DEFAULT_FILE
    ? STORAGE_KEY
    : `2026/${basename(localPath)}`;

  const body = await readFile(localPath);
  const { error } = await supabase.storage
    .from(bucket)
    .upload(storagePath, body, { contentType: 'application/pdf', upsert: true });

  if (error) {
    console.error('FAIL:', storagePath, error.message);
    if (error.message.includes('row-level security') && !env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error('  Tip: Add SUPABASE_SERVICE_ROLE_KEY to env for uploads (Supabase Dashboard > Settings > API).');
    }
    process.exit(1);
  }

  const { data } = supabase.storage.from(bucket).getPublicUrl(storagePath);
  console.log('OK:', storagePath);
  console.log('Public URL:', data.publicUrl);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
