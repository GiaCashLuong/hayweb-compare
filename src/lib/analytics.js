// GA4 + Microsoft Clarity tracking module — Site 1 Compare Tool
//
// Conditionally loaded based on Vercel env vars:
//   VITE_GA4_MEASUREMENT_ID   = G-XXXXXXXXXX  (peer: GA4 Admin → Data Streams → Web → Measurement ID)
//   VITE_CLARITY_PROJECT_ID   = aaaaaaaaaa    (peer: clarity.microsoft.com → Settings → Setup)
//
// Without env vars set, all track* helpers are no-ops (safe to call from React components).
//
// CSP requirements (already updated in vercel.json):
//   script-src 'self' https://www.googletagmanager.com https://www.clarity.ms
//   connect-src 'self' https://www.google-analytics.com https://*.clarity.ms https://jllirmrpkayiyajwebbr.supabase.co
//   img-src 'self' data: https: https://www.google-analytics.com https://*.clarity.ms
//
// Self-host upgrade path (Phase 2+, post-soft-launch): vendor gtag.js + clarity.js into public/vendor/
//   then switch script-src external whitelist → 'self'. Defer until GDPR/consent mode requirements clarify.
//
// 28 mandatory events per _master/skills/post-launch.md §4.5 — Site 1 subset:
//   1.  page_view (auto GA4)              15. lead_form_submit
//   2.  scroll_depth_25                    16. lead_form_field_focus
//   3.  scroll_depth_50                    17. lead_form_validation_error
//   4.  scroll_depth_75                    18. external_link_out
//   5.  scroll_depth_100                   19. cta_click
//   6.  session_start (auto GA4)           20. ai_referrer_detected
//   7.  user_engagement (auto GA4)         21. zalo_click
//   8.  audit_url_submitted                22. tel_click
//   9.  audit_completed                    23. nav_anchor_click
//  10.  audit_failed                       24. hayweb_pinned_view
//  11.  audit_url_validation_error         25. comparison_metric_hover
//  12.  audit_rate_limited                 26. share_link_copy
//  13.  audit_cache_hit                    27. error_javascript
//  14.  audit_cache_miss                   28. error_network
//
// Authority: Plan A handoff S4 §S4.3 GA4 + Clarity + tracking

const GA4_ID = import.meta.env.VITE_GA4_MEASUREMENT_ID;
const CLARITY_ID = import.meta.env.VITE_CLARITY_PROJECT_ID;
let initialized = false;

export function initAnalytics() {
  if (initialized) return;
  if (typeof window === 'undefined') return;
  initialized = true;

  // === Google Analytics 4 (gtag.js) ===
  if (GA4_ID) {
    const s = document.createElement('script');
    s.async = true;
    s.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(GA4_ID)}`;
    document.head.appendChild(s);

    window.dataLayer = window.dataLayer || [];
    window.gtag = function gtag() { window.dataLayer.push(arguments); };
    window.gtag('js', new Date());
    window.gtag('config', GA4_ID, {
      anonymize_ip: true,
      send_page_view: true,
      // GA4 → BigQuery free tier linkage configured separately in GA4 Admin
    });

    detectAIReferrer();
    installGlobalErrorTracking();
  }

  // === Microsoft Clarity (heatmap + session recording) ===
  if (CLARITY_ID) {
    (function (c, l, a, r, i) {
      c[a] = c[a] || function () {
        (c[a].q = c[a].q || []).push(arguments);
      };
      const t = l.createElement(r);
      t.async = 1;
      t.src = `https://www.clarity.ms/tag/${encodeURIComponent(i)}`;
      const y = l.getElementsByTagName(r)[0];
      y.parentNode.insertBefore(t, y);
    })(window, document, 'clarity', 'script', CLARITY_ID);
  }
}

// === AI engine referrer detection (HAYWEB custom — d0 baseline for Gate 4 v2) ===
function detectAIReferrer() {
  const ref = (document.referrer || '').toLowerCase();
  if (!ref) return;
  let aiSource = null;
  if (ref.includes('chat.openai.com') || ref.includes('chatgpt.com')) aiSource = 'chatgpt';
  else if (ref.includes('perplexity.ai')) aiSource = 'perplexity';
  else if (ref.includes('gemini.google.com') || ref.includes('bard.google.com')) aiSource = 'gemini';
  else if (ref.includes('claude.ai')) aiSource = 'claude';
  else if (ref.includes('aihay.vn') || ref.includes('aihay')) aiSource = 'aihay';
  else if (ref.includes('copilot.microsoft.com')) aiSource = 'copilot';
  if (aiSource && window.gtag) {
    window.gtag('event', 'ai_referrer_detected', {
      ai_source: aiSource,
      referrer_full: ref.substring(0, 200),
    });
  }
}

function installGlobalErrorTracking() {
  window.addEventListener('error', (e) => {
    trackEvent('error_javascript', {
      message: (e.message || '').substring(0, 200),
      filename: (e.filename || '').substring(0, 200),
      lineno: e.lineno ?? 0,
    });
  });
  window.addEventListener('unhandledrejection', (e) => {
    trackEvent('error_javascript', {
      message: ('unhandled_promise_rejection: ' + String(e.reason)).substring(0, 200),
    });
  });
}

// === Event helpers (no-ops when gtag not loaded) ===
export function trackEvent(name, params = {}) {
  if (typeof window === 'undefined' || !window.gtag) return;
  window.gtag('event', name, params);
}

export function trackCTAClick(ctaLabel, location) {
  trackEvent('cta_click', { cta_label: ctaLabel, location });
}

export function trackAuditURLSubmitted(urlCount) {
  trackEvent('audit_url_submitted', { url_count: urlCount });
}

export function trackAuditCompleted(durationMs, cacheHits, cacheMisses) {
  trackEvent('audit_completed', {
    duration_ms: durationMs,
    cache_hits: cacheHits,
    cache_misses: cacheMisses,
  });
}

export function trackAuditFailed(reason) {
  trackEvent('audit_failed', { reason: (reason || '').substring(0, 100) });
}

export function trackLeadFormSubmit(industry) {
  trackEvent('lead_form_submit', { industry });
}

export function trackLeadFormValidationError(field, errorType) {
  trackEvent('lead_form_validation_error', { field, error_type: errorType });
}

export function trackZaloClick(location) {
  trackEvent('zalo_click', { location });
}

// === Scroll depth auto-tracking (fires at 25/50/75/100%) ===
export function installScrollDepthTracker() {
  if (typeof window === 'undefined') return () => {};
  const fired = new Set();
  const thresholds = [25, 50, 75, 100];
  const handler = () => {
    const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
    if (scrollHeight <= 0) return;
    const percent = Math.min(100, Math.round((window.scrollY / scrollHeight) * 100));
    for (const t of thresholds) {
      if (percent >= t && !fired.has(t)) {
        fired.add(t);
        trackEvent(`scroll_depth_${t}`, { percent: t });
      }
    }
  };
  window.addEventListener('scroll', handler, { passive: true });
  return () => window.removeEventListener('scroll', handler);
}

// === External link out auto-tracking (delegate listener on <body>) ===
export function installExternalLinkTracker(sourcePage = 'unknown') {
  if (typeof window === 'undefined') return () => {};
  const handler = (e) => {
    const a = e.target.closest && e.target.closest('a');
    if (!a) return;
    const href = a.getAttribute('href') || '';
    if (!href.startsWith('http')) return;
    try {
      const url = new URL(href);
      if (url.hostname === window.location.hostname) return;
      // Special-case Zalo links to fire their own event
      if (url.hostname.includes('zalo.me') || url.hostname.includes('zalo.vn')) {
        trackZaloClick(sourcePage);
        return;
      }
      trackEvent('external_link_out', {
        url: href.substring(0, 200),
        source_page: sourcePage,
        dest_hostname: url.hostname,
      });
    } catch {
      /* invalid URL — ignore */
    }
  };
  document.addEventListener('click', handler, true);
  return () => document.removeEventListener('click', handler, true);
}
