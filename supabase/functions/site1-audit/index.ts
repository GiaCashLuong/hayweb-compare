// Site 1 Compare Tool — audit Edge Function v2 (15 BASIC chỉ tiêu)
// Spec: projects/official/2026-year-1-plan-a/_specs/site-1-architecture.md v2 §2
// Handoff: _master/handoffs/kiemtra-comparison-redesign/S1-redesign.md §3.1
// v1 → v2 (2026-05-20 Day 39 evening): expand 7 → 15 chỉ tiêu kiem-tra redesign.
//
// PUBLIC: 15 BASIC chỉ tiêu only — chia 3 nhóm UI: Bảo mật & Tin cậy (4) / Tốc độ & UX (6) / Cấu trúc SEO (5)
// Advanced metrics intentionally hidden per _specs/advanced-chi-tieu-internal.md
// CONTACT sales for 4 chỉ số nâng cao framework discussion 1-on-1
//
// 15 chỉ tiêu sources:
//   #1  Mozilla grade            — observatory-api.mdn.mozilla.net/api/v2/scan
//   #2  SSL valid                — Deno.connectTls + HEAD probe
//   #3  Lighthouse Performance   — PSI mobile category=performance
//   #4  Schema count             — DOM JSON-LD parse
//   #5  H1 + hierarchy           — DOM heading scan
//   #6  Image alt %              — DOM <img> alt audit
//   #7  Page load (TTFB+LCP)     — PSI audits.server-response-time + largest-contentful-paint
//   #8  Security headers count   — Mozilla v2 tests_passed
//   #9  HSTS preload             — HEAD probe headers parse
//   #10 CLS                      — PSI audits.cumulative-layout-shift
//   #11 Lighthouse Accessibility — PSI accessibility category
//   #12 JS bundle KB             — PSI audits.total-byte-weight + total-bytes-savings filter
//   #13 WebP image %             — DOM <img src> + <picture><source> extension scan
//   #14 FAQPage schema           — DOM JSON-LD @type === "FAQPage"
//   #15 LocalBusiness+Service+Person schemas count 0-3 — DOM JSON-LD

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

// === Runner 1+8: Mozilla Observatory v2 ===
// v1 returns grade + score + tests_passed (#8 expansion).
// MDN endpoint migrated mid-2026 (per S4B fix log).
async function runMozilla(host: string) {
  const MAX_ATTEMPTS = 3;
  const DELAY_MS = 10_000;
  const FETCH_TIMEOUT_MS = 15_000;
  const ENDPOINT = `https://observatory-api.mdn.mozilla.net/api/v2/scan?host=${encodeURIComponent(host)}`;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const res = await fetchWithTimeout(ENDPOINT, FETCH_TIMEOUT_MS, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': '0' },
      });
      if (res.ok) {
        const j: any = await res.json();
        if (j?.grade != null && j?.score != null) {
          if (attempt > 1) console.log(`[mozilla] ${host}: scan completed after ${attempt} attempts`);
          return {
            mozilla_grade: j.grade,
            mozilla_score: j.score,
            security_headers_passed: typeof j.tests_passed === 'number' ? j.tests_passed : null,
          };
        }
      }
      if (attempt < MAX_ATTEMPTS) await new Promise((r) => setTimeout(r, DELAY_MS));
    } catch (err) {
      console.warn(`[mozilla] ${host} attempt ${attempt} error:`, err instanceof Error ? err.message : err);
      if (attempt < MAX_ATTEMPTS) await new Promise((r) => setTimeout(r, DELAY_MS));
    }
  }
  console.warn(`[mozilla] ${host}: scan did not complete after ${MAX_ATTEMPTS} attempts`);
  return { mozilla_grade: null, mozilla_score: null, security_headers_passed: null };
}

// === Runner 2+9: SSL + HSTS preload ===
// SSL valid via Deno.connectTls + HEAD probe.
// HSTS preload: parse Strict-Transport-Security header for 'preload' directive.
async function runSSLAndHSTS(host: string, port = 443) {
  try {
    const conn = await Deno.connectTls({ hostname: host, port });
    if (conn.handshake) await conn.handshake();
    conn.close();
    const probe = await fetchWithTimeout(`https://${host}/`, 10_000, { method: 'HEAD' });
    if (probe.ok || (probe.status >= 200 && probe.status < 500)) {
      const hsts = probe.headers.get('strict-transport-security') ?? '';
      const hasPreload = /preload/i.test(hsts);
      return { ssl_valid: true, ssl_expiry_days: null, hsts_preload: hasPreload };
    }
    return { ssl_valid: false, ssl_expiry_days: null, hsts_preload: false };
  } catch {
    return { ssl_valid: false, ssl_expiry_days: null, hsts_preload: false };
  }
}

// === Runner 3+7+10+11+12: PageSpeed Insights (mobile) ===
// Single PSI call fetches multi-category result. Saves quota + avoids burst rate-limit.
// Categories requested: performance + accessibility.
async function runLighthouse(url: string) {
  const params = new URLSearchParams({ url, strategy: 'mobile' });
  // PSI accepts multiple `category` params via repeated keys
  params.append('category', 'performance');
  params.append('category', 'accessibility');
  if (PAGESPEED_API_KEY) params.set('key', PAGESPEED_API_KEY);
  const apiUrl = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?${params.toString()}`;

  try {
    const res = await fetchWithTimeout(apiUrl, 70_000);
    if (!res.ok) {
      console.warn(`[lighthouse] PSI returned HTTP ${res.status} for ${url}`);
      return {
        lighthouse_perf: null, lighthouse_variance: null, ttfb_ms: null, load_event_ms: null,
        cls: null, lighthouse_accessibility: null, js_bundle_kb: null,
      };
    }
    const j: any = await res.json();
    const perfScore = j?.lighthouseResult?.categories?.performance?.score;
    const a11yScore = j?.lighthouseResult?.categories?.accessibility?.score;
    const audits = j?.lighthouseResult?.audits ?? {};
    const ttfbAud = audits['server-response-time']?.numericValue;
    const lcpAud = audits['largest-contentful-paint']?.numericValue;
    const clsAud = audits['cumulative-layout-shift']?.numericValue;

    // JS bundle estimate: prefer script-treemap-data if present, fall back to total-byte-weight filtered
    let jsBundleKb: number | null = null;
    const treemap = audits['script-treemap-data']?.details?.nodes;
    if (Array.isArray(treemap)) {
      // resourceBytes ≈ uncompressed JS; multiply by ~0.33 typical gzip ratio
      const totalJsBytes = treemap.reduce((sum: number, n: any) => sum + (Number(n?.resourceBytes) || 0), 0);
      if (totalJsBytes > 0) jsBundleKb = Math.round((totalJsBytes * 0.33) / 1024);
    }
    if (jsBundleKb == null) {
      // Fallback: total-byte-weight items filter mime/type=script
      const items = audits['total-byte-weight']?.details?.items ?? [];
      const jsItems = items.filter((it: any) => typeof it?.url === 'string' && /\.js(\?|$)/.test(it.url));
      const totalJsBytes = jsItems.reduce((sum: number, it: any) => sum + (Number(it?.totalBytes) || 0), 0);
      if (totalJsBytes > 0) jsBundleKb = Math.round((totalJsBytes * 0.33) / 1024);
    }

    return {
      lighthouse_perf: typeof perfScore === 'number' ? Math.round(perfScore * 100) : null,
      lighthouse_variance: 0,
      ttfb_ms: typeof ttfbAud === 'number' ? Math.round(ttfbAud) : null,
      load_event_ms: typeof lcpAud === 'number' ? Math.round(lcpAud) : null,
      cls: typeof clsAud === 'number' ? Number(clsAud.toFixed(3)) : null,
      lighthouse_accessibility: typeof a11yScore === 'number' ? Math.round(a11yScore * 100) : null,
      js_bundle_kb: jsBundleKb,
    };
  } catch (err) {
    console.warn(`[lighthouse] error for ${url}:`, err instanceof Error ? err.message : err);
    return {
      lighthouse_perf: null, lighthouse_variance: null, ttfb_ms: null, load_event_ms: null,
      cls: null, lighthouse_accessibility: null, js_bundle_kb: null,
    };
  }
}

// === Runners 4-6+13-15: Schema + H1 + Image alt + WebP + FAQ + LocalPack (single HTML fetch) ===
async function runDom(url: string) {
  const empty = {
    schema_count: null, h1_count: null, heading_hierarchy_ok: null, image_alt_pct: null,
    webp_pct: null, schema_has_faq: null, schema_local_pack: null,
  };
  try {
    const res = await fetchWithTimeout(url, 15_000, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; HAYWEB-Compare/1.0)' },
    });
    if (!res.ok) return empty;
    const html = await res.text();
    const doc = new DOMParser().parseFromString(html, 'text/html');
    if (!doc) return empty;

    // Schema JSON-LD parse (collect ALL types for #4, FAQ for #14, LocalPack for #15)
    const ldScripts = doc.querySelectorAll('script[type="application/ld+json"]');
    const allTypes = new Set<string>();
    for (const s of ldScripts) {
      try {
        const parsed = JSON.parse((s as Element).textContent);
        collectTypes(parsed, allTypes);
      } catch { /* ignore malformed */ }
    }
    const schemaCount = allTypes.size;
    const hasFaq = allTypes.has('FAQPage');
    const localPackCount = ['LocalBusiness', 'Service', 'Person']
      .reduce((n, t) => n + (allTypes.has(t) ? 1 : 0), 0);
    // LocalBusiness has many subtypes (Restaurant, Dentist, etc.) — credit if ANY match
    const LOCAL_BUSINESS_SUBTYPES = [
      'LocalBusiness', 'Restaurant', 'Dentist', 'MedicalBusiness', 'LegalService',
      'ProfessionalService', 'FinancialService', 'Store', 'HomeAndConstructionBusiness',
      'AutomotiveBusiness', 'BeautySalon', 'Spa', 'HealthAndBeautyBusiness',
    ];
    let localPackAdjusted = localPackCount;
    if (!allTypes.has('LocalBusiness')) {
      const hasSubtype = LOCAL_BUSINESS_SUBTYPES.some((t) => allTypes.has(t));
      if (hasSubtype) localPackAdjusted = Math.min(3, localPackAdjusted + 1);
    }

    // H1 + heading hierarchy
    const headings = doc.querySelectorAll('h1, h2, h3, h4, h5, h6');
    const h1s = doc.querySelectorAll('h1');
    let lastLevel = 0;
    let hierarchyOk = true;
    for (const h of headings) {
      const lvl = parseInt((h as Element).tagName.substring(1), 10);
      if (lastLevel > 0 && lvl > lastLevel + 1) { hierarchyOk = false; break; }
      lastLevel = lvl;
    }

    // Image alt % + WebP %
    const imgs = doc.querySelectorAll('img');
    let total = 0, withAlt = 0, withWebp = 0;
    for (const img of imgs) {
      total++;
      const el = img as Element;
      const alt = el.getAttribute('alt');
      if (alt !== null && alt.trim().length > 0) withAlt++;
      const src = el.getAttribute('src') ?? '';
      const srcset = el.getAttribute('srcset') ?? '';
      if (/\.(webp|avif)(\?|$)/i.test(src) || /\.(webp|avif)/i.test(srcset)) withWebp++;
    }
    // Also count <picture><source type="image/webp"> as positive
    const sources = doc.querySelectorAll('picture source');
    for (const s of sources) {
      const type = (s as Element).getAttribute('type') ?? '';
      if (/image\/(webp|avif)/i.test(type)) withWebp++;
    }
    const altPct = total > 0 ? Math.round((withAlt / total) * 100) : 100;
    const webpPct = total > 0 ? Math.min(100, Math.round((withWebp / total) * 100)) : 100;

    return {
      schema_count: schemaCount,
      h1_count: h1s.length,
      heading_hierarchy_ok: hierarchyOk,
      image_alt_pct: altPct,
      webp_pct: webpPct,
      schema_has_faq: hasFaq,
      schema_local_pack: localPackAdjusted,
    };
  } catch {
    return empty;
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
      status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  let body: { url?: string; refresh?: boolean } = {};
  try { body = await req.json(); } catch {
    return new Response(JSON.stringify({ error: 'invalid_json' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const url = normalizeUrl(body.url ?? '');
  if (!url) {
    return new Response(JSON.stringify({ error: 'invalid_url' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
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
      status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
  await supabase.from('site1_rate_limit').upsert(
    { ip_hash: ipHash, window_start: windowStart.toISOString(), request_count: (rl?.request_count ?? 0) + 1 },
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
    // v2 gate: only return cached if has ANY v2 column populated (otherwise re-audit fresh)
    if (cached && cached.status === 'complete' && cached.security_headers_passed != null) {
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
  const [mozilla, sslHsts, lh, dom] = await Promise.all([
    runMozilla(host),
    runSSLAndHSTS(host),
    runLighthouse(url),
    runDom(url),
  ]);

  const data = {
    url_hash: urlHash,
    url_original: url,
    status: 'complete',
    audit_timestamp: new Date().toISOString(),
    ...mozilla,
    ...sslHsts,
    ...lh,
    ...dom,
  };

  await supabase.from('site1_audit_cache').upsert(data, { onConflict: 'url_hash' });

  return new Response(JSON.stringify({ status: 'complete', data }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
