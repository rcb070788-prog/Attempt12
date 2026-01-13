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
    const { from, subject, text, attachments } = payload;

    console.log(`Received email from ${from} with subject: ${subject}`);

    // 2. Identify the Parent Message ID from the subject line
    // We expect the subject to contain: [MSG-uuid-here]
    const match = subject.match(/\[MSG-(.*?)\]/);
    const parentId = match ? match[1] : null;

    if (!parentId) {
      console.error("No MSG ID found in subject line. Ignoring email.");
      return new Response(JSON.stringify({ error: "No parent ID found in subject" }), { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    // 3. Insert the official response into your board_messages table
    const { error: insertError } = await supabase
      .from('board_messages')
      .insert({
        content: text || "Official Response received (No text content)",
        parent_id: parentId,
        recipient_names: 'Constituent', 
        attachment_urls: attachments?.map((a: any) => a.url) || [],
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