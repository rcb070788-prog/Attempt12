import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  try {
    const body = await req.json()
    
    // 1. Extract details from Resend's inbound payload
    // Resend provides 'from', 'subject', 'text' (body), and 'attachments'
    // Depending on the version, data might be at the root or under 'data'
    const payload = body.data || body;
    const fromRaw = payload.from || payload.headers?.from || "";
    const fromEmail = fromRaw.match(/<(.+?)>/)?.[1] || fromRaw;
    const subject = payload.subject || "";
    const text = payload.text || "";
    const html = payload.html || "";
    const attachments = payload.attachments || [];

    const cleanEmailBody = (val: string) => {
      if (!val) return "";
      let source = val.replace(/<style[^>]*>.*<\/style>/gms, '').replace(/<[^>]*>?/gm, ' ');
      const delimiters = [
        /\n\s*On\s.*wrote:/i,
        /On\s.*at\s.*wrote/i,
        /\n\s*---+\s*Original Message\s*---+/i,
        /\n\s*From:\s*/i,
        /\n\s*Sent from my/i,
        /\n\s*_+/i
      ];
      for (const pattern of delimiters) {
        const match = source.match(pattern);
        if (match && match.index) source = source.substring(0, match.index);
      }
      return source.trim();
    };

    const finalContent = cleanEmailBody(text || html);
    const match = subject.match(/\[MSG-([\w-]+)\]/i);
    const parentId = match ? match[1] : null;

    if (!parentId || !finalContent) throw new Error("Missing ID or Content");

    // Logic: Identify if this is the Official or the Voter
    const { data: parentMsg } = await supabase.from('board_messages').select('user_id, profiles(email)').eq('id', parentId).single();
    const isVoter = fromEmail.toLowerCase() === parentMsg?.profiles?.email?.toLowerCase();

    const { error: insertError } = await supabase.from('board_messages').insert({
      content: finalContent,
      parent_id: parentId,
      user_id: isVoter ? parentMsg.user_id : null, // If voter follow-up, link to their ID
      recipient_names: isVoter ? 'Officials' : 'Constituent',
      is_official: !isVoter,
      attachment_urls: attachments.map((a: any) => a.url).filter(Boolean)
    });

    if (insertError) throw insertError;

    return new Response(JSON.stringify({ success: true }), { 
      status: 200, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });

  } catch (err: any) {
    console.error("Inbound Webhook Error:", err.message);
    return new Response(JSON.stringify({ error: err.message }), { 
      status: 500, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
  }
})