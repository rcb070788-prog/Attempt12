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
    } else {
      fromEmail = (fromRaw.match(/<(.+?)>/)?.[1] || fromRaw).toLowerCase().trim();
    }

    // 2. Routing Check: Only proceed if this email was sent to admin@concernedcitizensofmc.com
    const recipients = Array.isArray(payload.to) ? payload.to : [payload.to || ""];
    const isAdminEmail = recipients.some((email: string) => 
      email.toLowerCase().includes('admin@concernedcitizensofmc.com')
    );

    if (!isAdminEmail) {
      console.log("Routing: Email not for admin. Skipping.");
      return new Response(JSON.stringify({ filtered: true }), { status: 200, headers: corsHeaders });
    }

    const fromName = payload.from?.name || (fromRaw.match(/^"?(.*?)"?\s*</)?.[1] || "External Sender");
    const subject = payload.subject || payload.headers?.subject || "No Subject";
    let text = payload.text || payload.body || "";
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
      const fetchRes = await fetch(`https://api.resend.com/emails/receiving/${emailId}`, {
        headers: { 'Authorization': `Bearer ${RESEND_API_KEY}` }
      });
      if (fetchRes.ok) {
        const full = await fetchRes.json();
        const d = full.data || full;
        text = d.text || "";
        html = d.html || "";
        
        // Handle Inbound Attachments
        if (d.attachments && Array.isArray(d.attachments)) {
          for (const att of d.attachments) {
            const attRes = await fetch(`https://api.resend.com/emails/receiving/${emailId}/attachments/${att.id}`, {
              headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Accept': 'application/octet-stream' }
            });
            if (attRes.ok) {
              const attData = await attRes.arrayBuffer();
              const filePath = `inbound/${emailId}_${att.filename.replace(/[^a-z0-9.]/gi, '_')}`;
              const { error: uploadErr } = await supabase.storage.from('admin_inbox_attachments').upload(filePath, attData, { contentType: att.content_type || 'application/octet-stream' });
              if (!uploadErr) {
                const { data: urlData } = supabase.storage.from('admin_inbox_attachments').getPublicUrl(filePath);
                attachments.push(`${urlData.publicUrl}?filename=${encodeURIComponent(att.filename)}`);
              }
            }
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
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
  }
});