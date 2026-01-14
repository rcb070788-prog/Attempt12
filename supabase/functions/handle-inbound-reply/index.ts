import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');

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
    console.log("RAW_PAYLOAD_RECEIVED:", JSON.stringify(body));

    // Resend payloads usually put the email object inside 'data'
    const payload = body.data || body;
    
    const fromRaw = payload.from || payload.headers?.from || "";
    const fromEmail = (fromRaw.match(/<(.+?)>/)?.[1] || fromRaw).toLowerCase().trim();
    const subject = payload.subject || payload.headers?.subject || "";
    
    const emailId = payload.email_id;
    let text = payload.text || payload.body || payload.content || payload["stripped-text"] || payload["body-plain"] || "";
    let html = payload.html || payload["body-html"] || "";
    const attachments = payload.attachments || [];

    // If Resend didn't send the body in the webhook, fetch it using the emailId
    if (!text && !html && emailId && RESEND_API_KEY) {
      console.log(`FETCHING_CONTENT: Requesting body for Email ID: ${emailId}`);
      try {
        const fetchRes = await fetch(`https://api.resend.com/emails/${emailId}`, {
          headers: { 'Authorization': `Bearer ${RESEND_API_KEY}` }
        });
        if (fetchRes.ok) {
          const fullEmail = await fetchRes.json();
          text = fullEmail.text || "";
          html = fullEmail.html || "";
          console.log(`FETCH_SUCCESS: Retrieved content length: ${text.length || html.length}`);
        } else {
          console.error(`FETCH_ERROR: Resend API returned status ${fetchRes.status}`);
        }
      } catch (e) {
        console.error(`FETCH_CRITICAL_ERROR: ${e.message}`);
      }
    }

    const rawContent = text || html || "";
    console.log(`INBOUND_DEBUG: From: ${fromEmail} | Sub: ${subject} | RawLen: ${rawContent.length}`);

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

    // Ensure we extract content using the new variable names
    const finalContent = cleanEmailBody(rawContent);
    
    // Robust match for both UUIDs and numeric IDs
    const match = subject.match(/\[MSG-([a-f0-9-]+|[0-9]+)\]/i);
    const parentId = match ? match[1] : null;

    if (!parentId || finalContent.length < 2) {
      console.error(`Inbound Error - ID: ${parentId} | Raw: ${rawContent.length} | Clean: ${finalContent.length}`);
      return new Response(JSON.stringify({ 
        error: "Invalid payload", 
        id_found: !!parentId, 
        raw_len: rawContent.length,
        clean_len: finalContent.length 
      }), { status: 400, headers: corsHeaders });
    }

    // 1. Identify context from parent message
    const { data: parentMsg, error: fetchError } = await supabase
      .from('board_messages')
      .select('user_id, district, subject, profiles(email)')
      .eq('id', parentId)
      .maybeSingle();

    if (fetchError || !parentMsg) {
      console.error("INBOUND_ERROR: Parent message not found for ID:", parentId);
      throw new Error("Parent message context missing");
    }

    const profileData = Array.isArray(parentMsg?.profiles) ? parentMsg.profiles[0] : parentMsg?.profiles;
    const voterEmail = profileData?.email?.toLowerCase();
    const isVoter = voterEmail && fromEmail === voterEmail;

    console.log(`INBOUND_DEBUG: Processing reply for MSG-${parentId}. isVoter: ${isVoter}`);

    // 2. Insert reply inheriting metadata to ensure it appears in UI
    const { error: insertError } = await supabase.from('board_messages').insert({
      content: finalContent,
      parent_id: parentId,
      user_id: isVoter ? parentMsg.user_id : null,
      recipient_names: isVoter ? 'Officials' : 'Constituent',
      is_official: !isVoter,
      district: parentMsg.district, // CRITICAL: Inherit district so feed filters see it
      subject: parentMsg.subject ? `Re: ${parentMsg.subject}` : null,
      attachment_urls: attachments.map((a: any) => a.url || a.link).filter(Boolean)
    });

    if (insertError) {
      console.error("DB Insert Error:", insertError);
      throw insertError;
    }

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