// Site 1 Compare Tool — audit Edge Function
// Runs 7 BASIC chỉ tiêu in parallel + caches 24h
// Spec: projects/official/2026-year-1-plan-a/_specs/site-1-architecture.md §2
//
// PUBLIC: 7 BASIC chỉ tiêu only
// Advanced metrics intentionally hidden per _specs/advanced-chi-tieu-internal.md
// CONTACT sales for advanced framework discussion 1-on-1

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { DOMParser, Element } from 'https://deno.land/x/deno_dom@v0.1.45/deno-dom-wasm.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const PAGESPEED_API_KEY = Deno.env.get('PAGESPEED_API_KEY') ?? '';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function sha256(text: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

function normalizeUrl(input: string): string | null {
  try {
    const u = new URL(input.trim().startsWith('http') ? input.trim() : `https://${input.trim()}`);
    u.hash = '';
    u.search = '';
    return u.origin + (u.pathname === '/' ? '/' : u.pathname.replace(/\/$/, ''));
  } catch {
    return null;
  }
}

async function fetchWithTimeout(url: string, ms: number, init?: RequestInit): Promise<Response> {
  const ctl = new AbortController();
  const id = setTimeout(() => ctl.abort(), ms);
  try {
    return await fetch(url, { ...init, signal: ctl.signal });
  } finally {
    clearTimeout(id);
  }
}

// === Runner 1: Mozilla Observatory v2 (sync API) ===
async function runMozilla(host: string) {
  // MDN Observatory API (Mozilla migrated 2025-2026 from observatory.mozilla.org → MDN)
  // Endpoint: GET https://developer.mozilla.org/api/v1/observatory/analyze/?host=example.com
  // Returns: { grade, score, scanned_at, tests_passed, tests_failed }
  try {
    const res = await fetchWithTimeout(
      `https://developer.mozilla.org/api/v1/observatory/analyze/?host=${encodeURIComponent(host)}`,
      45_000,
    );
    if (!res.ok) return { mozilla_grade: null, mozilla_score: null };
    const j = await res.json();
    return { mozilla_grade: j.grade ?? null, mozilla_score: j.score ?? null };
  } catch {
    return { mozilla_grade: null, mozilla_score: null };
  }
}

// === Runner 2: SSL valid + expiry days ===
async function runSSL(host: string, port = 443) {
  try {
    const conn = await Deno.connectTls({ hostname: host, port });
    const peer = conn.handshake ? await conn.handshake() : null;
    // Deno's TLS API doesn't expose cert directly via std API; use a workaround via fetch
    conn.close();
    // Validate via HTTPS fetch — success ⇒ certificate trusted by Deno's root store
    const probe = await fetchWithTimeout(`https://${host}/`, 10_000, { method: 'HEAD' });
    if (probe.ok || (probe.status >= 200 && probe.status < 500)) {
      // Try to extract expiry via fallback API (ssl-labs free) — kept simple, use null if unavailable
      return { ssl_valid: true, ssl_expiry_days: null };
    }
    return { ssl_valid: false, ssl_expiry_days: null };
  } catch {
    return { ssl_valid: false, ssl_expiry_days: null };
  }
}

// === Runner 3: PageSpeed Insights (Lighthouse hosted) ===
// 3 runs averaged per spec §4
async function runLighthouse(url: string) {
  const apiUrl = (i: number) => {
    const params = new URLSearchParams({
      url,
      strategy: 'mobile',
      category: 'performance',
    });
    if (PAGESPEED_API_KEY) params.set('key', PAGESPEED_API_KEY);
    return `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?${params.toString()}&_n=${i}`;
  };

  const runs = await Promise.allSettled([
    fetchWithTimeout(apiUrl(1), 60_000).then((r) => r.json()),
    fetchWithTimeout(apiUrl(2), 60_000).then((r) => r.json()),
    fetchWithTimeout(apiUrl(3), 60_000).then((r) => r.json()),
  ]);

  const perfs: number[] = [];
  let ttfb = 0;
  let loadEvent = 0;
  let okCount = 0;
  for (const r of runs) {
    if (r.status !== 'fulfilled') continue;
    const j: any = r.value;
    const score = j?.lighthouseResult?.categories?.performance?.score;
    if (typeof score === 'number') perfs.push(Math.round(score * 100));
    const audits = j?.lighthouseResult?.audits;
    const ttfbAud = audits?.['server-response-time']?.numericValue;
    const lcpAud = audits?.['largest-contentful-paint']?.numericValue;
    if (typeof ttfbAud === 'number') {
      ttfb += ttfbAud;
      okCount++;
    }
    if (typeof lcpAud === 'number') loadEvent += lcpAud;
  }

  if (!perfs.length) {
    return { lighthouse_perf: null, lighthouse_variance: null, ttfb_ms: null, load_event_ms: null };
  }
  const avg = perfs.reduce((a, b) => a + b, 0) / perfs.length;
  const variance = Math.max(...perfs) - Math.min(...perfs);
  return {
    lighthouse_perf: Math.round(avg),
    lighthouse_variance: variance,
    ttfb_ms: okCount ? Math.round(ttfb / okCount) : null,
    load_event_ms: okCount ? Math.round(loadEvent / okCount) : null,
  };
}

// === Runners 4-6: Schema + H1 + Image alt (single HTML fetch) ===
async function runDom(url: string) {
  try {
    const res = await fetchWithTimeout(url, 15_000, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; HAYWEB-Compare/1.0)' },
    });
    if (!res.ok) {
      return { schema_count: null, h1_count: null, heading_hierarchy_ok: null, image_alt_pct: null };
    }
    const html = await res.text();
    const doc = new DOMParser().parseFromString(html, 'text/html');
    if (!doc) {
      return { schema_count: null, h1_count: null, heading_hierarchy_ok: null, image_alt_pct: null };
    }

    // Schema JSON-LD count
    const ldScripts = doc.querySelectorAll('script[type="application/ld+json"]');
    let schemaTypes = 0;
    for (const s of ldScripts) {
      try {
        const parsed = JSON.parse((s as Element).textContent);
        const types = collectTypes(parsed);
        schemaTypes += types.size;
      } catch {
        /* ignore malformed */
      }
    }

    // H1 + heading hierarchy
    const headings = doc.querySelectorAll('h1, h2, h3, h4, h5, h6');
    const h1s = doc.querySelectorAll('h1');
    let lastLevel = 0;
    let hierarchyOk = true;
    for (const h of headings) {
      const lvl = parseInt((h as Element).tagName.substring(1), 10);
      if (lastLevel > 0 && lvl > lastLevel + 1) {
        hierarchyOk = false;
        break;
      }
      lastLevel = lvl;
    }

    // Image alt %
    const imgs = doc.querySelectorAll('img');
    let total = 0;
    let withAlt = 0;
    for (const img of imgs) {
      total++;
      const alt = (img as Element).getAttribute('alt');
      if (alt !== null && alt.trim().length > 0) withAlt++;
    }
    const altPct = total > 0 ? Math.round((withAlt / total) * 100) : 100;

    return {
      schema_count: schemaTypes,
      h1_count: h1s.length,
      heading_hierarchy_ok: hierarchyOk,
      image_alt_pct: altPct,
    };
  } catch {
    return { schema_count: null, h1_count: null, heading_hierarchy_ok: null, image_alt_pct: null };
  }
}

function collectTypes(node: any, out = new Set<string>()): Set<string> {
  if (!node) return out;
  if (Array.isArray(node)) {
    for (const n of node) collectTypes(n, out);
    return out;
  }
  if (typeof node === 'object') {
    if (typeof node['@type'] === 'string') out.add(node['@type']);
    else if (Array.isArray(node['@type'])) for (const t of node['@type']) out.add(t);
    if (Array.isArray(node['@graph'])) for (const g of node['@graph']) collectTypes(g, out);
  }
  return out;
}

// === Main handler ===
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'method_not_allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  let body: { url?: string; refresh?: boolean } = {};
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'invalid_json' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const url = normalizeUrl(body.url ?? '');
  if (!url) {
    return new Response(JSON.stringify({ error: 'invalid_url' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Rate limit by IP — 5 / hour
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'unknown';
  const ipHash = await sha256(ip);
  const windowStart = new Date();
  windowStart.setMinutes(0, 0, 0);
  const { data: rl } = await supabase
    .from('site1_rate_limit')
    .select('request_count')
    .eq('ip_hash', ipHash)
    .eq('window_start', windowStart.toISOString())
    .maybeSingle();
  if (rl && rl.request_count >= 5) {
    return new Response(JSON.stringify({ error: 'rate_limit' }), {
      status: 429,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
  await supabase.from('site1_rate_limit').upsert(
    {
      ip_hash: ipHash,
      window_start: windowStart.toISOString(),
      request_count: (rl?.request_count ?? 0) + 1,
    },
    { onConflict: 'ip_hash,window_start' },
  );

  const urlHash = await sha256(url);

  // Cache hit
  if (!body.refresh) {
    const { data: cached } = await supabase
      .from('site1_audit_cache')
      .select('*')
      .eq('url_hash', urlHash)
      .gt('expires_at', new Date().toISOString())
      .maybeSingle();
    if (cached && cached.status === 'complete') {
      return new Response(JSON.stringify({ status: 'cached', data: cached }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  }

  // Mark running
  await supabase.from('site1_audit_cache').upsert(
    { url_hash: urlHash, url_original: url, status: 'running', audit_timestamp: new Date().toISOString() },
    { onConflict: 'url_hash' },
  );

  const host = new URL(url).hostname;
  const [mozilla, ssl, lh, dom] = await Promise.all([
    runMozilla(host),
    runSSL(host),
    runLighthouse(url),
    runDom(url),
  ]);

  const data = {
    url_hash: urlHash,
    url_original: url,
    status: 'complete',
    audit_timestamp: new Date().toISOString(),
    ...mozilla,
    ...ssl,
    ...lh,
    ...dom,
  };

  await supabase.from('site1_audit_cache').upsert(data, { onConflict: 'url_hash' });

  return new Response(JSON.stringify({ status: 'complete', data }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
