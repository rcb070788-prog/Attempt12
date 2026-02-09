
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || '';

export const handler = async (event: any) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  if (!supabaseUrl || !supabaseServiceKey) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Server Configuration Error: Missing SUPABASE_SERVICE_KEY in Netlify settings.',
      }),
    };
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const { voterId } = JSON.parse(event.body || '{}');
    if (!voterId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ valid: false, error: 'voterId is required.' }),
      };
    }

    const { data: voter, error } = await supabase
      .from('voter_registry')
      .select('voter_id')
      .eq('voter_id', voterId)
      .maybeSingle();

    if (error || !voter) {
      return {
        statusCode: 401,
        body: JSON.stringify({
          valid: false,
          error: 'Voter ID not found in the Moore County registry.',
        }),
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ valid: true }),
    };
  } catch (err: any) {
    return {
      statusCode: 500,
      body: JSON.stringify({ valid: false, error: err?.message || 'System error during verification.' }),
    };
  }
};
