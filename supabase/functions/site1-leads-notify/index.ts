// Site 1 Compare Tool — lead notification Edge Function
//
// Purpose: invoked by Supabase Database Webhook on `site1_leads` INSERT
// Posts lead summary to Zalo OA webhook (peer-configured) so founder gets push notification
// instead of polling Supabase dashboard.
//
// Setup steps (Điện Hạ peer manual):
//   1. Deploy this function: `supabase functions deploy site1-leads-notify --no-verify-jwt`
//   2. Set secret: `supabase secrets set ZALO_OA_WEBHOOK_URL=https://oa.zalo.me/v3/webhook/...`
//      (Zalo OA webhook URL hoặc Zalo Notification Service endpoint)
//   3. Set secret: `supabase secrets set NOTIFY_HMAC_SECRET=<random-32-byte-secret>`
//      (used to authenticate Database Webhook → this function calls)
//   4. Configure Supabase Database Webhook:
//      Supabase Studio → Database → Webhooks → New webhook
//        Name: site1-leads-insert-notify
//        Table: site1_leads
//        Events: INSERT
//        Method: POST
//        URL: https://jllirmrpkayiyajwebbr.supabase.co/functions/v1/site1-leads-notify
//        HTTP Headers:
//          x-notify-secret: <same value as NOTIFY_HMAC_SECRET>
//          Content-Type: application/json
//
// Until peer wires Zalo URL: function returns early with diagnostic 200 (does not block lead INSERT).
//
// Authority: Plan A handoff S4 §S4.2 Zalo OA auto-notify wire (defer from S2 _status.md Open items)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const ZALO_OA_WEBHOOK_URL = Deno.env.get('ZALO_OA_WEBHOOK_URL') ?? '';
const NOTIFY_HMAC_SECRET = Deno.env.get('NOTIFY_HMAC_SECRET') ?? '';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-notify-secret',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface DatabaseWebhookPayload {
  type: 'INSERT' | 'UPDATE' | 'DELETE';
  table: string;
  schema: string;
  record: {
    id?: string;
    name?: string;
    email?: string;
    zalo?: string;
    current_web?: string;
    industry?: string;
    created_at?: string;
    [key: string]: unknown;
  };
  old_record?: unknown;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // Auth check — only accept calls from Supabase Database Webhook with correct secret
  const providedSecret = req.headers.get('x-notify-secret') ?? '';
  if (NOTIFY_HMAC_SECRET && providedSecret !== NOTIFY_HMAC_SECRET) {
    return new Response(JSON.stringify({ ok: false, error: 'unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  let payload: DatabaseWebhookPayload;
  try {
    payload = await req.json();
  } catch {
    return new Response(JSON.stringify({ ok: false, error: 'invalid_json' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  if (payload.type !== 'INSERT' || payload.table !== 'site1_leads') {
    // Ignore non-INSERT events or wrong table — return 200 so webhook doesn't retry
    return new Response(JSON.stringify({ ok: true, skipped: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const lead = payload.record;
  const message = [
    '🔔 Lead mới — Site 1 (kiem-tra.hayweb.vn)',
    `Tên: ${lead.name ?? '(chưa nhập)'}`,
    `Email: ${lead.email ?? '(chưa nhập)'}`,
    `Zalo: ${lead.zalo ?? '(chưa nhập)'}`,
    `Web hiện tại: ${lead.current_web ?? '(chưa nhập)'}`,
    `Ngành: ${lead.industry ?? '(chưa nhập)'}`,
    `Thời gian: ${lead.created_at ?? new Date().toISOString()}`,
    '',
    'Reply trong 4h theo Growth tier SLA. Xem chi tiết tại Supabase dashboard.',
  ].join('\n');

  // If Zalo URL not configured yet → log + return 200 (avoid blocking lead INSERT pipeline)
  if (!ZALO_OA_WEBHOOK_URL) {
    console.log('[lead-notify] ZALO_OA_WEBHOOK_URL not set yet — lead captured but notify skipped:', message);
    return new Response(JSON.stringify({ ok: true, notified: false, reason: 'zalo_url_not_configured' }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Forward to Zalo OA webhook (peer-configured endpoint)
  try {
    const zaloRes = await fetch(ZALO_OA_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: message,
        source: 'site1-leads',
        lead_id: lead.id,
      }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!zaloRes.ok) {
      console.warn('[lead-notify] Zalo OA returned non-200:', zaloRes.status);
      return new Response(JSON.stringify({ ok: true, notified: false, zalo_status: zaloRes.status }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    return new Response(JSON.stringify({ ok: true, notified: true, lead_id: lead.id }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[lead-notify] Zalo forward error:', err instanceof Error ? err.message : err);
    return new Response(JSON.stringify({ ok: true, notified: false, error: 'zalo_forward_failed' }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
