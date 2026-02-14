import { createClient } from '@supabase/supabase-js';
import type { Config } from '@netlify/functions';

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || '';

export const config: Config = {
  schedule: '@monthly',
};

export const handler = async () => {
  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY');
    return { statusCode: 500, body: 'Server configuration error' };
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const { data: expired, error: fetchErr } = await supabase
      .from('profiles')
      .select('id')
      .not('scheduled_removal_at', 'is', null)
      .lte('scheduled_removal_at', new Date().toISOString());

    if (fetchErr) {
      console.error('Failed to fetch expired profiles:', fetchErr);
      return { statusCode: 500, body: JSON.stringify({ error: fetchErr.message }) };
    }

    const ids = (expired || []).map((p) => p.id);
    if (ids.length === 0) {
      return { statusCode: 200, body: JSON.stringify({ deleted: 0, message: 'No expired profiles' }) };
    }

    const { error: deleteErr } = await supabase.from('profiles').delete().in('id', ids);

    if (deleteErr) {
      console.error('Failed to delete expired profiles:', deleteErr);
      return { statusCode: 500, body: JSON.stringify({ error: deleteErr.message }) };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ deleted: ids.length, ids }),
    };
  } catch (err: any) {
    console.error('Cleanup error:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err?.message || 'System error during cleanup.' }),
    };
  }
};
