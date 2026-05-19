import { AUDIT_FN_URL, supabase } from './supabase.js';

const HAYWEB_URL = 'https://hayweb.vn';

export async function runAudit(url) {
  const session = await supabase.auth.getSession();
  const token = session?.data?.session?.access_token ?? import.meta.env.VITE_SUPABASE_ANON_KEY;
  const res = await fetch(AUDIT_FN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({ url }),
  });
  if (!res.ok) {
    const errBody = await res.json().catch(() => ({ error: 'unknown' }));
    const err = new Error(errBody.error ?? `audit_failed_${res.status}`);
    err.status = res.status;
    throw err;
  }
  const j = await res.json();
  return j.data;
}

export async function getHaywebPinned() {
  const { data, error } = await supabase
    .from('site1_audit_cache')
    .select('*')
    .eq('is_pinned', true)
    .order('audit_timestamp', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) return null;
  if (!data) {
    // Fallback live audit on first ever load
    try {
      return await runAudit(HAYWEB_URL);
    } catch {
      return null;
    }
  }
  return data;
}

// === 7 BASIC chỉ tiêu evaluation ===
// PUBLIC: 7 BASIC chỉ tiêu only
// Advanced metrics intentionally hidden per _specs/advanced-chi-tieu-internal.md

export const METRICS = [
  {
    key: 'mozilla',
    label: 'Mozilla Observatory',
    short: 'Bảo mật',
    evaluate: (d) => {
      if (d?.mozilla_grade == null) return { state: 'unknown', value: '—' };
      const g = d.mozilla_grade;
      const display = `${g}${d.mozilla_score != null ? ` (${d.mozilla_score})` : ''}`;
      if (g.startsWith('A')) return { state: 'pass', value: display };
      if (g.startsWith('B') || g.startsWith('C')) return { state: 'warn', value: display };
      return { state: 'fail', value: display };
    },
  },
  {
    key: 'ssl',
    label: 'SSL / HTTPS',
    short: 'SSL',
    evaluate: (d) => {
      if (d?.ssl_valid == null) return { state: 'unknown', value: '—' };
      if (!d.ssl_valid) return { state: 'fail', value: 'không hợp lệ' };
      return { state: 'pass', value: 'hợp lệ' };
    },
  },
  {
    key: 'lighthouse',
    label: 'Lighthouse mobile',
    short: 'Hiệu năng',
    evaluate: (d) => {
      if (d?.lighthouse_perf == null) return { state: 'unknown', value: '—' };
      const v = d.lighthouse_perf;
      const variance = d.lighthouse_variance ?? 0;
      const suffix = variance > 5 ? ` ±${variance}` : '';
      if (v >= 90) return { state: 'pass', value: `${v}${suffix}` };
      if (v >= 70) return { state: 'warn', value: `${v}${suffix}` };
      return { state: 'fail', value: `${v}${suffix}` };
    },
  },
  {
    key: 'schema',
    label: 'Schema markup',
    short: 'Schema',
    evaluate: (d) => {
      if (d?.schema_count == null) return { state: 'unknown', value: '—' };
      const c = d.schema_count;
      if (c >= 3) return { state: 'pass', value: `${c} type` };
      if (c >= 1) return { state: 'warn', value: `${c} type` };
      return { state: 'fail', value: '0 type' };
    },
  },
  {
    key: 'h1',
    label: 'H1 + hierarchy',
    short: 'H1',
    evaluate: (d) => {
      if (d?.h1_count == null) return { state: 'unknown', value: '—' };
      const ok = d.h1_count === 1 && d.heading_hierarchy_ok;
      const warn = d.h1_count === 1 && !d.heading_hierarchy_ok;
      const value = `${d.h1_count} H1${d.heading_hierarchy_ok ? ' · hierarchy OK' : ' · hierarchy lệch'}`;
      if (ok) return { state: 'pass', value };
      if (warn) return { state: 'warn', value };
      return { state: 'fail', value };
    },
  },
  {
    key: 'alt',
    label: 'Image alt',
    short: 'Alt',
    evaluate: (d) => {
      if (d?.image_alt_pct == null) return { state: 'unknown', value: '—' };
      const v = d.image_alt_pct;
      if (v >= 95) return { state: 'pass', value: `${v}%` };
      if (v >= 70) return { state: 'warn', value: `${v}%` };
      return { state: 'fail', value: `${v}%` };
    },
  },
  {
    key: 'load',
    label: 'Page load',
    short: 'Tải trang',
    evaluate: (d) => {
      if (d?.ttfb_ms == null) return { state: 'unknown', value: '—' };
      const ttfb = d.ttfb_ms;
      const lcp = d.load_event_ms;
      const value = `TTFB ${ttfb}ms${lcp ? ` · LCP ${lcp}ms` : ''}`;
      if (ttfb < 800 && (!lcp || lcp < 3000)) return { state: 'pass', value };
      if (ttfb < 1800) return { state: 'warn', value };
      return { state: 'fail', value };
    },
  },
];
