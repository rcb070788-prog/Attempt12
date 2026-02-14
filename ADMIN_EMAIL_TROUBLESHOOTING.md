# Admin Email Feature – Troubleshooting Summary

Copy and paste this into a new chat to continue troubleshooting.

---

## What We've Done

### 1. Admin Email Section Visibility (Fixed)
- **Issue:** Admin Email section (broadcast + one-off) was not visible on live Netlify deployment.
- **Fix:** Reordered AdminPanel sections so Admin Email appears before Admin Inbox (higher on page).
- **File:** `src/features/admin/AdminPanel.tsx`

### 2. Local Dev Blank Screen (Fixed)
- **Issue:** `__DEFINES__ is not defined` and MIME type "" errors in Vite dev.
- **Fix:** Removed `define` block from vite.config.ts; set Netlify plugin to `apply: 'build'` only.
- **File:** `vite.config.ts`

### 3. Netlify Function 404 (Not Fixed – Bypassed)
- **Issue:** `/.netlify/functions/send-admin-email` and `/api/send-admin-email` both returned 404 on deployed site.
- **Context:** Netlify dashboard shows 8 functions deployed, including `send-admin-email`. Function exists in `netlify/functions/send-admin-email.ts`. 404 persisted despite deployment.
- **Attempted fixes:**
  - Added redirect `/.netlify/functions/*` → invalid (Netlify rejects `/.netlify` in redirect source).
  - Added proxy `/api/send-admin-email` → `/.netlify/functions/send-admin-email` → still 404.
  - Reverted to direct path `/.netlify/functions/send-admin-email` → still 404.

### 4. Bypass to Supabase Edge Functions (Current Approach)
- **Change:** Client now calls Supabase Edge Functions directly instead of Netlify function:
  - One-off: `https://<supabase-url>/functions/v1/send-admin-one-off`
  - Broadcast: `https://<supabase-url>/functions/v1/send-admin-broadcast`
- **File:** `src/features/admin/admin/AdminEmailSection.tsx`
- **Auth:** Passes `Authorization: Bearer <session.access_token>` and `apikey: <anon_key>` headers.

### 5. CORS Preflight Error (Current Issue)
- **Error:** `Access to fetch at 'https://hovdckksdjofgghaxtif.supabase.co/functions/v1/send-admin-one-off' from origin 'https://concernedcitizensofmc.com' has been blocked by CORS policy: Response to preflight request doesn't pass access control check: It does not have HTTP ok status.`
- **Meaning:** The browser sends an OPTIONS preflight before the POST. The preflight response is not 2xx, so the browser blocks the request.
- **Latest fix attempted:** Added `apikey` header to fetch calls (Supabase Edge Functions often require it for the gateway to accept requests).

---

## Current State

- **AdminEmailSection.tsx** calls Supabase Edge Functions directly with:
  - `Authorization: Bearer <token>`
  - `apikey: <VITE_SUPABASE_ANON_KEY>`
  - `Content-Type: application/json`
- **Supabase functions** (`supabase/functions/send-admin-one-off`, `send-admin-broadcast`):
  - Handle OPTIONS with `return new Response('ok', { headers: corsHeaders })`
  - Use `_shared/cors.ts` with `Access-Control-Allow-Origin: *`, `Access-Control-Allow-Headers: authorization, x-client-info, apikey, content-type`
- **Netlify function** `send-admin-email` is no longer used by the client.

---

## Next Steps for Troubleshooting

1. **Confirm Supabase Edge Functions are deployed**
   - Run: `supabase functions deploy send-admin-one-off` and `supabase functions deploy send-admin-broadcast`
   - Check Supabase Dashboard → Edge Functions for deployment status.

2. **If CORS persists after adding apikey header:**
   - Verify the function is reachable: `curl -X OPTIONS https://hovdckksdjofgghaxtif.supabase.co/functions/v1/send-admin-one-off -H "Origin: https://concernedcitizensofmc.com" -v` and inspect status code and CORS headers.
   - Check Supabase Edge Function logs (Dashboard → Edge Functions → Logs) for errors on OPTIONS.
   - Consider using `supabase.functions.invoke()` from the Supabase client instead of raw fetch (it may handle headers and CORS correctly).

3. **Alternative: Restore Netlify function path**
   - If Supabase direct calls keep failing, consider debugging why the Netlify function returns 404 despite being listed as deployed (e.g. branch, deploy context, or routing).

4. **RESEND_API_KEY**
   - Ensure `RESEND_API_KEY` is set in Supabase (Project Settings → Edge Functions → Secrets) so the functions can send email.
