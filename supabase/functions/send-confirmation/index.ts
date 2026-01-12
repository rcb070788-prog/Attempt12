import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS for browser requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { email, fullName, status } = await req.json()

    // Determine message content
    const isConfirmed = status === 'Confirmed';
    const subject = isConfirmed ? "Moore County Portal: Access Granted" : "Moore County Portal: Access Denied";
    const message = isConfirmed 
      ? `Your voter verification was successful. You now have full access to vote in polls and message officials.`
      : `We were unable to verify your voter registration with the details provided. Please contact an admin if you believe this is an error.`;

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'Concerned Citizens of MC <verification@concernedcitizensofmc.com>', 
        to: [email],
        subject: subject,
        html: `
          <div style="font-family: sans-serif; padding: 20px;">
            <h2 style="color: #4f46e5;">Hello ${fullName},</h2>
            <p style="font-size: 16px; color: #374151;">${message}</p>
            <hr style="border: 1px solid #e5e7eb; margin: 20px 0;" />
            <p style="font-size: 12px; color: #9ca3af; text-transform: uppercase;">© Moore County Transparency Portal</p>
          </div>
        `,
      }),
    })

    const data = await res.json()
    
    // If Resend returned an error (like a 403 or 422), pass that error to Supabase logs
    if (!res.ok) {
      console.error("Resend API Error:", JSON.stringify(data));
      return new Response(JSON.stringify(data), { 
        status: res.status, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      })
    }

    return new Response(JSON.stringify(data), { 
      status: 200, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    })
  }
})
