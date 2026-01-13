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
    const { from, subject, text, attachments } = body.data || body;

    console.log(`Received email from ${from} with subject: ${subject}`);

    // 2. Identify the Parent Message ID from the subject line
    // This looks for the [MSG-123] tag we added in the outbound email
    const match = subject.match(/\[MSG-(.*?)\]/);
    const parentId = match ? match[1] : null;

    if (!parentId) {
      console.error("No MSG ID found in subject line. Ignoring email.");
      return new Response(JSON.stringify({ error: "No parent ID found" }), { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    // 3. Insert the official response into your table
    // Note: We use the parent_id to link it to the original constituent message
    const { error: insertError } = await supabase
      .from('board_messages')
      .insert({
        content: text,
        parent_id: parentId,
        recipient_names: 'Constituent', // Reversing the role
        attachment_urls: attachments?.map((a: any) => a.url) || [],
        // Assuming your profile/user logic: 
        // We leave user_id null or use a system ID for official replies
      });

    if (insertError) throw insertError;

    return new Response(JSON.stringify({ success: true }), { 
      status: 200, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });

  } catch (err: any) {
    console.error("Inbound Error:", err.message);
    return new Response(JSON.stringify({ error: err.message }), { 
      status: 500, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
  }
})