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
    console.log("PAYLOAD_KEYS:", Object.keys(body));
    if (body.data) console.log("DATA_KEYS:", Object.keys(body.data));

    // Resend payloads usually put the email object inside 'data'
    const payload = body.data || body;
    
    // Robust sender extraction for both Object and String formats
    let fromEmail = "";
    const fromRaw = payload.from || payload.headers?.from || "";
    if (typeof fromRaw === 'object' && fromRaw !== null) {
      fromEmail = (fromRaw.email || fromRaw.address || "").toLowerCase().trim();
    } else {
      fromEmail = (fromRaw.match(/<(.+?)>/)?.[1] || fromRaw).toLowerCase().trim();
    }

    const subject = payload.subject || payload.headers?.subject || "";
    const emailId = payload.email_id || payload.id;
    
    // Support standard body keys and Resend Inbound Rule keys
    let text = payload.text || payload.body || payload.content || payload["stripped-text"] || payload["body-plain"] || "";
    let html = payload.html || payload["body-html"] || "";
    const attachments = payload.attachments || [];

    // PATH B: Fetch full content from Resend API using the receiving endpoint
    if (!text && !html && emailId && RESEND_API_KEY) {
      console.log(`PATH_B_FETCH: Requesting body for Received Email ID: ${emailId}`);
      try {
        // Updated URL to the receiving-specific endpoint
        const fetchRes = await fetch(`https://api.resend.com/emails/receiving/${emailId}`, {
          headers: { 
            'Authorization': `Bearer ${RESEND_API_KEY}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (fetchRes.ok) {
          const fullEmail = await fetchRes.json();
          const emailData = fullEmail.data || fullEmail;
          text = emailData.text || "";
          html = emailData.html || "";
          
          // PATH B - STEP 2: Process binary attachments using your Resend discovery
          if (emailData.attachments && Array.isArray(emailData.attachments)) {
            for (const att of emailData.attachments) {
              try {
                // FETCH: Using the specific path you found in the Resend portal
                const attRes = await fetch(`https://api.resend.com/emails/receiving/${emailId}/attachments/${att.id}`, {
                  headers: { 'Authorization': `Bearer ${RESEND_API_KEY}` }
                });
                
                if (attRes.ok) {
                  const attData = await attRes.arrayBuffer();
                  const msgMatch = subject.match(/\[MSG-([^\]\s]+)\]/i);
                  const attParentId = msgMatch ? msgMatch[1] : 'orphaned';

                  const safeName = att.filename.replace(/[^a-zA-Z0-9.]/g, '_');
                  const filePath = `${attParentId}/${Date.now()}_${safeName}`;
                  
                  // DETECT: Ensure browser viewers open PDFs/Images correctly
                  let detectedType = att.content_type || 'application/octet-stream';
                  const lower = att.filename.toLowerCase();
                  if (lower.endsWith('.pdf')) detectedType = 'application/pdf';
                  else if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) detectedType = 'image/jpeg';
                  else if (lower.endsWith('.png')) detectedType = 'image/png';

                  const { error: uploadErr } = await supabase.storage
                    .from('board_attachments')
                    .upload(filePath, attData, {
                      contentType: detectedType,
                      cacheControl: '3600',
                      upsert: true
                    });

                  if (!uploadErr) {
                    const { data: urlData } = supabase.storage.from('board_attachments').getPublicUrl(filePath);
                    // Standardize URL with a 'filename' parameter so UI can read the name
                    attachments.push(`${urlData.publicUrl}?filename=${encodeURIComponent(att.filename)}`);
                    console.log(`UPLOAD_SUCCESS: ${att.filename} -> ${urlData.publicUrl}`);
                  }
                }
              } catch (attErr) { console.error(`ATTACH_ERR: ${att.filename}:`, attErr.message); }
            }
          }
          console.log(`FETCH_SUCCESS: Retrieved content and processed ${attachments.length} attachments.`);
        } else {
          const errorText = await fetchRes.text();
          console.error(`FETCH_ERROR: status ${fetchRes.status} - ${errorText}`);
        }
      } catch (e) {
        console.error(`FETCH_CRITICAL_ERROR: ${e.message}`);
      }
    }

    const cleanEmailBody = (val: string) => {
      if (!val) return "";
      // Strip HTML and styles first
      let source = val.replace(/<style[^>]*>.*<\/style>/gms, '').replace(/<[^>]*>?/gm, ' ');
      
      const delimiters = [
        /\s*On\s+(?:(?!\n).)*wrote:/i,             // Matches: On Thu, Jan 15... wrote:
        /\s*On\s+(?:(?!\n).)*at\s+(?:(?!\n).)*wrote/i, // Matches: On ... at ... wrote
        /^-+ original message -+$/im,
        /^-+ forwarded message -+$/im,
        /\n\s*From:\s*/i,
        /\n\s*Sent from my/i,
        /\n\s*Sent via/i
      ];

      for (const pattern of delimiters) {
        const parts = source.split(pattern);
        if (parts.length > 0) source = parts[0];
      }

      return source
        .split('\n')
        .map(line => line.trim())
        // Remove quoted lines (starting with >) and horizontal rules
        .filter(line => !line.startsWith('>') && !line.startsWith('---'))
        .join('\n')
        .replace(/\n{3,}/g, '\n\n') // Consolidate excessive newlines
        .trim();
    };

    // Refresh rawContent after Path B fetch attempt
    const rawContent = text || html || "";
    console.log(`INBOUND_DEBUG: From: ${fromEmail} | Sub: ${subject} | RawLen: ${rawContent.length}`);

    // Content Hunter: Looks for any string that looks like an email body
    const findGreedyContent = (obj: any): string => {
      if (!obj) return "";
      // Keys we know are NOT the body
      const skipKeys = ['from', 'to', 'subject', 'message_id', 'email_id', 'id', 'created_at', 'type', 'object', 'reply_to', 'address', 'name', 'email'];
      
      // 1. Check common body keys first
      const priorityKeys = ['text', 'html', 'body', 'content', 'body_text', 'stripped-text'];
      for (const k of priorityKeys) {
        if (obj[k] && typeof obj[k] === 'string' && obj[k].length > 1) return obj[k];
      }

      // 2. Search everything else
      for (const key in obj) {
        const val = obj[key];
        if (typeof val === 'string' && val.length > 3 && !skipKeys.includes(key.toLowerCase())) {
          // If it's a long string with spaces, it's probably the message
          if (val.includes(" ") || val.includes("\n")) return val;
        } else if (typeof val === 'object' && val !== null) {
          const deep = findGreedyContent(val);
          if (deep) return deep;
        }
      }
      return "";
    };

    // Recalculate finalContent using the potentially newly fetched rawContent
    let finalContent = cleanEmailBody(rawContent);

    // If Path B and standard extraction both yielded nothing, trigger Content Hunter
    if (finalContent.length < 2) {
      console.log("CONTENT_EMPTY: Triggering Content Hunter...");
      const greedyMatch = findGreedyContent(body);
      if (greedyMatch) {
        console.log(`HUNTER_SUCCESS: Content recovered. Length: ${greedyMatch.length}`);
        finalContent = cleanEmailBody(greedyMatch);
      } else {
        console.log("HUNTER_FAILED: No body content found anywhere in the payload keys.");
      }
    }
    
    // Support UUIDs by matching any non-bracket character inside the MSG tag
    const match = subject.match(/\[MSG-([^\]\s]+)\]/i);
    const parentId = match ? match[1] : null;

    if (!parentId) {
      console.error(`Inbound Error - No ID found in subject. Raw body length: ${rawContent.length}`);
      return new Response(JSON.stringify({ 
        error: "Missing ID", 
        id_found: false
      }), { status: 200, headers: corsHeaders }); 
    }
    
    // We allow length 0 so it reaches the portal for debugging
    if (finalContent.length === 0) {
      console.log("DEBUG: Proceeding with empty content to restore portal visibility.");
    }

    // 1. Identify context (Lookup the specific board message being replied to)
    const { data: contextData, error: fetchError } = await supabase
      .from('board_messages')
      .select('user_id, district, subject')
      .eq('id', parentId)
      .maybeSingle();

    if (fetchError || !contextData) {
      console.error("INBOUND_ERROR: ID not found in board_messages table:", parentId);
      return new Response(JSON.stringify({ error: "Context ID not found", id: parentId }), { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    console.log(`MATCH_FOUND: ID ${parentId} found in board_messages.`);

    // 2. Insert the reply as a new board_message linked to the parent
    // Official status is determined by the sender's email domain (Testing with Gmail)
    const isOfficial = fromEmail.includes('gmail.com') || fromEmail.includes('concernedcitizensofmc.com');
    
    console.log(`INBOUND_DEBUG: Inserting Reply for Message: ${parentId}. Official: ${isOfficial}`);
    
    // Ensure finalContent is populated from Path B fetch before insert
    const finalDisplayContent = finalContent && finalContent.length > 0 ? finalContent : "(Message content could not be retrieved)";

    const { error: insertError } = await supabase.from('board_messages').insert({
      content: finalDisplayContent,
      parent_id: parentId,
      user_id: contextData.user_id,
      recipient_names: isOfficial ? 'Constituent' : 'Officials',
      is_official: isOfficial,
      district: contextData.district,
      subject: contextData.subject ? `Re: ${contextData.subject}` : null,
      // Map URLs if they exist, or filenames as a fallback for metadata visibility
      attachment_urls: attachments.map((a: any) => {
        if (typeof a === 'string') return a;
        return a.url || a.link || (a.filename ? `[File: ${a.filename}]` : null);
      }).filter(Boolean)
    });

    if (insertError) {
      console.error("DATABASE_INSERT_ERROR:", insertError);
      throw insertError;
    }

    // Successfully inserted reply

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