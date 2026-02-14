import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || '';

const BATCH_SIZE = 100;
const FIVE_YEARS_MS = 5 * 365.25 * 24 * 60 * 60 * 1000;

async function resolveUniqueVirtualEmail(
  fullName: string,
  district: string,
  supabase: ReturnType<typeof createClient>,
  excludeProfileId?: string
): Promise<string> {
  const [fName, ...lNameParts] = fullName.split(' ');
  const lName = lNameParts.join('').replace(/[^a-z0-9]/gi, '');
  const bSlug = `${(fName || '').toLowerCase()}.${lName.toLowerCase()}`;
  let finalVirtualEmail = `${bSlug}@concernedcitizensofmc.com`;

  let query = supabase.from('profiles').select('id').eq('virtual_email', finalVirtualEmail);
  if (excludeProfileId) query = query.neq('id', excludeProfileId);
  const { data: level1 } = await query.maybeSingle();

  if (level1) {
    finalVirtualEmail = `${bSlug}.${district}@concernedcitizensofmc.com`;
    let q2 = supabase.from('profiles').select('id').eq('virtual_email', finalVirtualEmail);
    if (excludeProfileId) q2 = q2.neq('id', excludeProfileId);
    const { data: level2 } = await q2.maybeSingle();
    if (level2) {
      let counter = 1;
      let isUnique = false;
      while (!isUnique && counter < 50) {
        const testEmail = `${bSlug}.${district}.${counter}@concernedcitizensofmc.com`;
        let q3 = supabase.from('profiles').select('id').eq('virtual_email', testEmail);
        if (excludeProfileId) q3 = q3.neq('id', excludeProfileId);
        const { data: ex } = await q3.maybeSingle();
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
    const authHeader = event.headers.authorization;
    if (!authHeader) {
      return { statusCode: 401, body: JSON.stringify({ error: 'Missing Auth Header' }) };
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) };
    }

    const { data: profile, error: profErr } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single();

    if (profErr || !profile?.is_admin) {
      return { statusCode: 403, body: JSON.stringify({ error: 'Forbidden: Admins only.' }) };
    }

    const body = JSON.parse(event.body || '{}');
    const dryRun = body.dryRun === true;

    const { data: profiles, error: profilesErr } = await supabase
      .from('profiles')
      .select('id, voter_id, full_name, virtual_email, district')
      .not('voter_id', 'is', null)
      .eq('is_admin', false)
      .is('scheduled_removal_at', null);

    if (profilesErr) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Failed to fetch profiles: ' + profilesErr.message }),
      };
    }

    const toRemove: string[] = [];
    const toUpdate: { id: string; full_name: string; virtual_email: string; district: string }[] = [];
    let processed = 0;

    for (let i = 0; i < (profiles || []).length; i += BATCH_SIZE) {
      const batch = (profiles || []).slice(i, i + BATCH_SIZE);
      for (const p of batch) {
        const { data: voter, error: voterErr } = await supabase
          .from('voter_registry')
          .select('voter_id, first_name, last_name, district')
          .eq('voter_id', p.voter_id)
          .maybeSingle();

        if (voterErr || !voter) {
          toRemove.push(p.id);
          processed++;
          continue;
        }

        const registryFullName = `${(voter.first_name || '').trim()} ${(voter.last_name || '').trim()}`.trim().toUpperCase();
        const registryDistrict = String(voter.district ?? '').trim();

        const nameChanged = p.full_name?.toUpperCase() !== registryFullName;
        const districtChanged = p.district?.trim() !== registryDistrict;

        if (nameChanged || districtChanged) {
          const virtual_email = await resolveUniqueVirtualEmail(
            registryFullName,
            registryDistrict,
            supabase,
            p.id
          );
          toUpdate.push({
            id: p.id,
            full_name: registryFullName,
            virtual_email,
            district: registryDistrict,
          });
        }
        processed++;
      }
    }

    if (dryRun) {
      return {
        statusCode: 200,
        body: JSON.stringify({
          dryRun: true,
          toRemove: toRemove.length,
          toUpdate: toUpdate.length,
          toRemoveIds: toRemove,
          toUpdateDetails: toUpdate,
        }),
      };
    }

    let removed = 0;
    let updated = 0;

    for (const profileId of toRemove) {
      const scheduledRemovalAt = new Date(Date.now() + FIVE_YEARS_MS).toISOString();
      const { error: updateErr } = await supabase
        .from('profiles')
        .update({ scheduled_removal_at: scheduledRemovalAt })
        .eq('id', profileId);

      if (updateErr) {
        console.error('Failed to set scheduled_removal_at for', profileId, updateErr);
        continue;
      }

      const { error: deleteErr } = await supabase.auth.admin.deleteUser(profileId);
      if (deleteErr) {
        console.error('Failed to delete auth user', profileId, deleteErr);
        continue;
      }
      removed++;
    }

    for (const u of toUpdate) {
      const { error: updateErr } = await supabase
        .from('profiles')
        .update({
          full_name: u.full_name,
          virtual_email: u.virtual_email,
          district: u.district,
        })
        .eq('id', u.id);

      if (updateErr) {
        console.error('Failed to update profile', u.id, updateErr);
        continue;
      }
      updated++;
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        processed,
        removed,
        updated,
      }),
    };
  } catch (err: any) {
    console.error('Sync error:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err?.message || 'System error during sync.' }),
    };
  }
};
