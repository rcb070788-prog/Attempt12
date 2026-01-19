import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  const supabase = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');

  try {
    const body = await req.json();
    const payload = body.data || body;
    const emailId = payload.email_id || payload.id;

    // 1. Extract basic info
    let fromEmail = "";
    const fromRaw = payload.from || payload.headers?.from || "";
    
    if (typeof fromRaw === 'object' && fromRaw !== null) {
      fromEmail = (fromRaw.email || fromRaw.address || "").toLowerCase().trim();
    } else if (typeof fromRaw === 'string') {
      fromEmail = (fromRaw.match(/<(.+?)>/)?.[1] || fromRaw).toLowerCase().trim();
    }

    // Fallback: If still empty, check inside data.from (Resend format)
    if (!fromEmail && payload.data?.from) {
      fromEmail = (payload.data.from.email || "").toLowerCase().trim();
    }

    // 2. Routing Check: Handle both strings and objects from Resend
    const rawTo = payload.to || payload.headers?.to || "";
    const recipients = Array.isArray(rawTo) ? rawTo : [rawTo];
    const isAdminEmail = recipients.some((email: string) => 
      email.toLowerCase().includes('admin@concernedcitizensofmc.com')
    );

    if (!isAdminEmail) {
      console.log("Routing: Email not for admin. Skipping.");
      return new Response(JSON.stringify({ filtered: true }), { status: 200, headers: corsHeaders });
    }

    const fromName = payload.from?.name || (typeof fromRaw === 'string' ? (fromRaw.match(/^"?(.*?)"?\s*</)?.[1] || "External Sender") : "External Sender");
    const subject = payload.subject || payload.headers?.subject || "No Subject";
    
    // Use "Greedy" logic to find the body if standard keys are missing
    let text = payload.text || payload.body || payload.content || findGreedyContent(payload);
    let html = payload.html || "";
    const attachments: string[] = [];

    // 3. Security Analysis Check
    let securityFlag = 'clean';
    let securityNote = '';
    const dangerousExtensions = /\.(exe|scr|vbs|bat|js|zip|rar|7z)$/i;
    const suspiciousLinks = /(bit\.ly|t\.co|tinyurl\.com|goo\.gl)/i;

    if (dangerousExtensions.test(text) || dangerousExtensions.test(html)) {
      securityFlag = 'warning';
      securityNote = 'Warning: Message contains references to potentially dangerous file types.';
    }
    if (suspiciousLinks.test(text) || suspiciousLinks.test(html)) {
      securityFlag = 'warning';
      securityNote += ' Detected shortened/tracking links.';
    }

    // 4. Path B: Fetch full content if missing
    if (!text && !html && emailId && RESEND_API_KEY) {
      console.log(`PATH_B_FETCH: Downloading full email content for ${emailId}`);
      const fetchRes = await fetch(`https://api.resend.com/emails/receiving/${emailId}`, {
        headers: { 'Authorization': `Bearer ${RESEND_API_KEY}` }
      });
      if (fetchRes.ok) {
        const full = await fetchRes.json();
        const d = full.data || full;
        text = d.text || "";
        html = d.html || "";
        
        if (d.attachments && Array.isArray(d.attachments)) {
          for (const att of d.attachments) {
            try {
              const attRes = await fetch(`https://api.resend.com/emails/receiving/${emailId}/attachments/${att.id}`, {
                headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Accept': 'application/octet-stream' }
              });
              if (attRes.ok) {
                const attData = await attRes.arrayBuffer();
                const safeName = att.filename.replace(/[^a-z0-9.]/gi, '_');
                const filePath = `${emailId}/${Date.now()}_${safeName}`;
                
                const { error: uploadErr } = await supabase.storage
                  .from('admin_inbox_attachments')
                  .upload(filePath, attData, { 
                    contentType: att.content_type || 'application/octet-stream',
                    upsert: true 
                  });

                if (!uploadErr) {
                  const { data: urlData } = supabase.storage.from('admin_inbox_attachments').getPublicUrl(filePath);
                  attachments.push(`${urlData.publicUrl}?filename=${encodeURIComponent(att.filename)}`);
                }
              }
            } catch (e) { console.error("Attach Error:", e); }
          }
        }
      }
    }

    // 5. Insert into Database
    const { error: insertErr } = await supabase.from('admin_messages').insert({
      from_email: fromEmail,
      from_name: fromName,
      subject: subject,
      content: text,
      html_content: html,
      attachment_urls: attachments,
      security_flag: securityFlag,
      security_note: securityNote.trim()
    });

    if (insertErr) throw insertErr;
    return new Response(JSON.stringify({ success: true }), { status: 200, headers: corsHeaders });
  } catch (err: any) {
    console.error("ADMIN_INBOX_ERROR:", err.message);
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
  }
});

// Helper to find the email body if standard keys are missing
const findGreedyContent = (obj: any): string => {
  if (!obj) return "";
  const priorityKeys = ['text', 'html', 'body', 'content', 'body_text', 'stripped-text'];
  for (const k of priorityKeys) {
    if (obj[k] && typeof obj[k] === 'string' && obj[k].length > 1) return obj[k];
  }
  for (const key in obj) {
    const val = obj[key];
    if (typeof val === 'string' && val.length > 3 && !['from', 'to', 'subject'].includes(key.toLowerCase())) {
      if (val.includes(" ") || val.includes("\n")) return val;
    } else if (typeof val === 'object' && val !== null) {
      const deep = findGreedyContent(val);
      if (deep) return deep;
    }
  }
  return "";
};