
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || '';

export const handler = async (event: any) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  if (!supabaseUrl || !supabaseServiceKey) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Server Configuration Error: Missing SUPABASE_SERVICE_KEY in Netlify settings." })
    };
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const { lastName, voterId, dob } = JSON.parse(event.body);

    // 1. Fetch the voter record by ID only
    const { data: voter, error } = await supabase
      .from('voter_registry')
      .select('*')
      .eq('voter_id', voterId)
      .single();

    if (error || !voter) {
      return { 
        statusCode: 401, 
        body: JSON.stringify({ error: "Voter ID not found in the Moore County registry." }) 
      };
    }

    // 2. Perform the logic check: Voter ID is matched, now check Last Name OR DOB
    const lastNameMatch = lastName && voter.last_name?.toUpperCase() === lastName.toUpperCase();
    const dobMatch = dob && voter.date_of_birth === dob;

    if (lastNameMatch || dobMatch) {
      return {
        statusCode: 200,
        body: JSON.stringify({ 
          success: true, 
          district: voter.district,
          voterId: voter.voter_id,
          fullName: `${voter.first_name || ''} ${voter.last_name}`.trim().toUpperCase()
        }),
      };
    } else {
      // 3. If neither matches, deny entry
      return {
        statusCode: 401,
        body: JSON.stringify({ error: "Verification Failed: Provided Last Name or Date of Birth does not match our records for this Voter ID." })
      };
    }
  } catch (error) {
    return { statusCode: 500, body: JSON.stringify({ error: "System error during verification." }) };
  }
};
