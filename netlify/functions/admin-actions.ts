import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || '';

export const handler = async (event: any) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const authHeader = event.headers.authorization;
    if (!authHeader) return { statusCode: 401, body: JSON.stringify({ error: "Missing Auth Header" }) };
    
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) return { statusCode: 401, body: JSON.stringify({ error: "Unauthorized" }) };

    // Admin Check
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single();

    if (!profile?.is_admin) return { statusCode: 403, body: JSON.stringify({ error: "Forbidden: Admins only" }) };

    const { action, payload } = JSON.parse(event.body);

    switch (action) {
      case 'CREATE_POLL':
        const { pollData, options } = payload;
        const { data: newPoll, error: pErr } = await supabase
          .from('polls')
          .insert([{ ...pollData, created_by: user.id }])
          .select()
          .single();
        
        if (pErr) throw pErr;

        const pollOptions = options.map((opt: string) => ({
          poll_id: newPoll.id,
          text: opt
        }));
        await supabase.from('poll_options').insert(pollOptions);
        return { statusCode: 200, body: JSON.stringify({ success: true }) };

      case 'BAN_USER':
        await supabase
          .from('profiles')
          .update({ is_banned: payload.isBanned })
          .eq('id', payload.targetUserId);
        return { statusCode: 200, body: JSON.stringify({ success: true }) };

      case 'MODERATE_COMMENT':
        await supabase
          .from('poll_comments')
          .update({ is_hidden: payload.isHidden })
          .eq('id', payload.commentId);
        return { statusCode: 200, body: JSON.stringify({ success: true }) };

      default:
        return { statusCode: 400, body: JSON.stringify({ error: "Unknown action" }) };
    }
  } catch (err: any) {
    console.error("Admin Error:", err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};