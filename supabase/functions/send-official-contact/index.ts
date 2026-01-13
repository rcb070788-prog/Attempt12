import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const body = await req.json()
    const { senderName, fromEmail, recipients, subject, content, attachments } = body

    // Filter out any blank strings or invalid addresses from the recipients array
    const validRecipients = (recipients || []).filter((email: string) => email && email.includes('@'));

    if (validRecipients.length === 0) {
      throw new Error("No valid recipient email addresses found.")
    }

    // Use validRecipients for the to: field below

    // 1. Prepare the email for Resend
    // 'fromEmail' comes from App.tsx (e.g. john.doe@concernedcitizensofmc.com)
    // 'recipients' comes from App.tsx (filtered from your constants.ts)
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: `"${senderName}" <verification@concernedcitizensofmc.com>`,
        // Use the validated/filtered recipient list
        to: validRecipients,
        subject: subject, // This contains the [MSG-ID]
        text: content,
        // If your database has attachment URLs, we can include them as text links
        html: `
          <div style="font-family: sans-serif; line-height: 1.5;">
            <h2>Message for Public Record</h2>
            <p><strong>From:</strong> ${senderName} (${fromEmail})</p>
            <hr />
            <div style="white-space: pre-wrap;">${content}</div>
            <br />
            ${attachments && attachments.length > 0 ? `
              <p><strong>Attachments:</strong></p>
              <ul>
                ${attachments.map((url: string, i: number) => `<li><a href="${url}">View Attachment ${i+1}</a></li>`).join('')}
              </ul>
            ` : ''}
            <hr />
            <p style="font-size: 10px; color: #666;">
              This is a verified message from the Moore County Transparency Portal. 
              Replying to this email will post your response directly to the Public Record.
            </p>
          </div>
        `,
      }),
    })

    const data = await res.json()
    if (!res.ok) throw new Error(JSON.stringify(data))

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})