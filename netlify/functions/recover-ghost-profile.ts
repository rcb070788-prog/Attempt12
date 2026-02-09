import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || '';

async function resolveUniqueVirtualEmail(
  fullName: string,
  district: string,
  supabase: ReturnType<typeof createClient>
): Promise<string> {
  const [fName, ...lNameParts] = fullName.split(' ');
  const lName = lNameParts.join('').replace(/[^a-z0-9]/gi, '');
  const bSlug = `${(fName || '').toLowerCase()}.${lName.toLowerCase()}`;
  let finalVirtualEmail = `${bSlug}@concernedcitizensofmc.com`;

  const { data: level1 } = await supabase
    .from('profiles')
    .select('id')
    .eq('virtual_email', finalVirtualEmail)
    .maybeSingle();

  if (level1) {
    finalVirtualEmail = `${bSlug}.${district}@concernedcitizensofmc.com`;
    const { data: level2 } = await supabase
      .from('profiles')
      .select('id')
      .eq('virtual_email', finalVirtualEmail)
      .maybeSingle();
    if (level2) {
      let counter = 1;
      let isUnique = false;
      while (!isUnique && counter < 50) {
        const testEmail = `${bSlug}.${district}.${counter}@concernedcitizensofmc.com`;
        const { data: ex } = await supabase
          .from('profiles')
          .select('id')
          .eq('virtual_email', testEmail)
          .maybeSingle();
        if (!ex) {
          finalVirtualEmail = testEmail;
          isUnique = true;
        }
        counter++;
      }
    }
  }
  return finalVirtualEmail;
}

export const handler = async (event: any) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  if (!supabaseUrl || !supabaseServiceKey) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Server Configuration Error: Missing SUPABASE_SERVICE_KEY in Netlify settings.',
      }),
    };
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const { email, lastName, voterId, dob } = JSON.parse(event.body || '{}');
    if (!email || !voterId || (!lastName && !dob)) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          action: 'error',
          error: 'Missing required fields: email, voterId, and either lastName or dob.',
        }),
      };
    }

    // 1. Re-verify voter (same logic as verify-voter)
    const { data: voter, error: voterErr } = await supabase
      .from('voter_registry')
      .select('*')
      .eq('voter_id', voterId)
      .single();

    if (voterErr || !voter) {
      return {
        statusCode: 401,
        body: JSON.stringify({
          action: 'verification_failed',
          error: 'Voter ID not found in the Moore County registry.',
        }),
      };
    }

    const lastNameMatch = lastName && voter.last_name?.toUpperCase() === lastName.toUpperCase();
    const dobMatch = dob && voter.date_of_birth === dob;
    if (!lastNameMatch && !dobMatch) {
      return {
        statusCode: 401,
        body: JSON.stringify({
          action: 'verification_failed',
          error:
            'Provided Last Name or Date of Birth does not match our records for this Voter ID.',
        }),
      };
    }

    const fullName = `${voter.first_name || ''} ${voter.last_name}`.trim().toUpperCase();
    const district = voter.district ?? '';
    const voter_id = voter.voter_id;

    // 2. Resolve unique virtual_email (same slug logic as SignupPage)
    const virtual_email = await resolveUniqueVirtualEmail(fullName, district, supabase);

    // 3. Find auth user by email (admin API)
    const { data: listData, error: listErr } = await supabase.auth.admin.listUsers({
      perPage: 1000,
    });
    if (listErr) {
      return {
        statusCode: 500,
        body: JSON.stringify({ action: 'error', error: listErr.message }),
      };
    }
    const authUser = listData?.users?.find(
      (u) => u.email?.toLowerCase() === String(email).toLowerCase()
    );
    if (!authUser) {
      return {
        statusCode: 200,
        body: JSON.stringify({ action: 'no_auth_user' }),
      };
    }

    // 4. Check if profile already exists for this user
    const { data: existingProfile, error: profileCheckErr } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', authUser.id)
      .maybeSingle();

    if (profileCheckErr) {
      return {
        statusCode: 500,
        body: JSON.stringify({ action: 'error', error: profileCheckErr.message }),
      };
    }
    if (existingProfile) {
      return {
        statusCode: 200,
        body: JSON.stringify({ action: 'already_has_profile' }),
      };
    }

    // 5. Insert profile for the ghost auth user
    const { error: insertErr } = await supabase.from('profiles').insert({
      id: authUser.id,
      full_name: fullName,
      district,
      voter_id: voter_id,
      virtual_email,
      avatar_url: null,
      is_admin: false,
      is_banned: false,
    });

    if (insertErr) {
      return {
        statusCode: 500,
        body: JSON.stringify({ action: 'error', error: insertErr.message }),
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ action: 'profile_created' }),
    };
  } catch (error: any) {
    return {
      statusCode: 500,
      body: JSON.stringify({ action: 'error', error: error?.message || 'System error.' }),
    };
  }
};
