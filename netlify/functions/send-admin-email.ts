const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';

export const handler = async (event: any) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  }

  const authHeader = event.headers?.authorization;
  if (!authHeader) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Missing Authorization header' }) };
  }

  if (!supabaseUrl) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Server configuration error: SUPABASE_URL not set' }),
    };
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const { type } = body;

    if (type === 'one-off') {
      const { recipients, subject, content } = body;
      const res = await fetch(`${supabaseUrl}/functions/v1/send-admin-one-off`, {
        method: 'POST',
        headers: {
          Authorization: authHeader,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ recipients, subject, content }),
      });
      const data = await res.json();
      return {
        statusCode: res.status,
        body: JSON.stringify(data),
      };
    }

    if (type === 'broadcast') {
      const { mode, subject, content } = body;
      const res = await fetch(`${supabaseUrl}/functions/v1/send-admin-broadcast`, {
        method: 'POST',
        headers: {
          Authorization: authHeader,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ mode, subject, content }),
      });
      const data = await res.json();
      return {
        statusCode: res.status,
        body: JSON.stringify(data),
      };
    }

    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Invalid type. Use "one-off" or "broadcast".' }),
    };
  } catch (err: any) {
    console.error('send-admin-email error:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err?.message || 'Internal server error' }),
    };
  }
};
