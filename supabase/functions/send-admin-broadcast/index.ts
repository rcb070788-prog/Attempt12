import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { corsHeaders } from "../_shared/cors.ts"

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing Authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single()

    if (!profile?.is_admin) {
      return new Response(JSON.stringify({ error: 'Forbidden: Admins only' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { mode, subject, content } = await req.json()
    if (!subject || !content) {
      return new Response(JSON.stringify({ error: 'Subject and content are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (mode !== 'real' && mode !== 'virtual') {
      return new Response(JSON.stringify({ error: 'Mode must be "real" or "virtual"' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (!RESEND_API_KEY) {
      return new Response(JSON.stringify({ error: 'RESEND_API_KEY not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    let emails: string[] = []

    if (mode === 'real') {
      const allEmails: string[] = []
      let page = 1
      const perPage = 1000
      let hasMore = true
      while (hasMore) {
        const { data, error } = await supabase.auth.admin.listUsers({ page, perPage })
        if (error) throw error
        const users = data?.users ?? []
        for (const u of users) {
          if (u.email && u.email.includes('@')) allEmails.push(u.email)
        }
        hasMore = users.length === perPage
        page++
      }
      emails = allEmails
    } else {
      const { data, error } = await supabase
        .from('profiles')
        .select('virtual_email')
      if (error) throw error
      emails = (data ?? [])
        .map((p: { virtual_email: string | null }) => p.virtual_email)
        .filter((e: string | null): e is string => !!e && e.includes('@'))
    }

    if (emails.length === 0) {
      return new Response(JSON.stringify({ success: true, sent: 0, message: 'No recipients found' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const BATCH_SIZE = 50
    let sent = 0
    for (let i = 0; i < emails.length; i += BATCH_SIZE) {
      const batch = emails.slice(i, i + BATCH_SIZE)
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from: 'Moore County Portal <verification@concernedcitizensofmc.com>',
          to: batch,
          subject,
          reply_to: 'admin@concernedcitizensofmc.com',
          html: `
            <div style="font-family: sans-serif; padding: 20px;">
              <div style="white-space: pre-wrap; font-size: 16px; color: #374151;">${content.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>
              <hr style="border: 1px solid #e5e7eb; margin: 20px 0;" />
              <p style="font-size: 12px; color: #9ca3af; text-transform: uppercase;">Moore County Transparency Portal</p>
            </div>
          `,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        console.error('Resend API Error:', JSON.stringify(data))
        return new Response(JSON.stringify({ error: data?.message || 'Failed to send emails' }), {
          status: res.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      sent += batch.length
    }

    return new Response(JSON.stringify({ success: true, sent }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err: any) {
    console.error('send-admin-broadcast error:', err.message)
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
