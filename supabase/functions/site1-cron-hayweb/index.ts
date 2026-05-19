// Site 1 Compare Tool — HAYWEB pinned daily refresh
// Cron daily 6am via Vercel Cron OR Supabase Scheduled (pg_cron)
// Re-audits https://hayweb.vn + marks is_pinned=true
//
// Spec: projects/official/2026-year-1-plan-a/_specs/site-1-architecture.md §5
// PUBLIC: 7 BASIC chỉ tiêu only

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const SITE1_AUDIT_FN_URL = `${SUPABASE_URL}/functions/v1/site1-audit`;
const HAYWEB_URL = 'https://hayweb.vn';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function sha256(text: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

Deno.serve(async (req) => {
  // Auth: Vercel Cron sends Authorization: Bearer <CRON_SECRET>
  const cronSecret = Deno.env.get('CRON_SECRET') ?? '';
  const authHeader = req.headers.get('authorization') ?? '';
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return new Response(JSON.stringify({ error: 'unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const res = await fetch(SITE1_AUDIT_FN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    },
    body: JSON.stringify({ url: HAYWEB_URL, refresh: true }),
  });

  if (!res.ok) {
    return new Response(JSON.stringify({ error: 'audit_failed', status: res.status }), {
      status: 502,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const urlHash = await sha256(HAYWEB_URL);
  await supabase.from('site1_audit_cache').update({ is_pinned: true }).eq('url_hash', urlHash);

  return new Response(JSON.stringify({ status: 'refreshed', url: HAYWEB_URL }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
