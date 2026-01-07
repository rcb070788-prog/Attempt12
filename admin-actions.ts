
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || '';

export const handler = async (event: any) => {
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  
  // Verify User is Admin
  const token = event.headers.authorization?.replace('Bearer ', '');
  if (!token) return { statusCode: 401, body: 'Unauthorized' };

  const { data: { user } } = await supabase.auth.getUser(token);
  if (!user) return { statusCode: 401, body: 'Invalid Token' };

  const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single();
  if (!profile?.is_admin) return { statusCode: 403, body: 'Forbidden' };

  const { action, payload } = JSON.parse(event.body);

  try {
    if (action === 'BAN_USER') {
      await supabase.from('profiles').update({ is_banned: true }).eq('id', payload.userId);
    } else if (action === 'DELETE_COMMENT') {
      await supabase.from('poll_comments').delete().eq('id', payload.commentId);
    } else if (action === 'CREATE_POLL') {
      const { data: poll } = await supabase.from('polls').insert(payload.poll).select().single();
      if (payload.options) {
        const options = payload.options.map((text: string) => ({ poll_id: poll.id, text }));
        await supabase.from('poll_options').insert(options);
      }
    }

    return { statusCode: 200, body: JSON.stringify({ success: true }) };
  } catch (error: any) {
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }
};
