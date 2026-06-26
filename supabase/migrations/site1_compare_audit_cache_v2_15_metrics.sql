-- Site 1 Compare Tool — Migration v2: expand 7 → 15 BASIC chỉ tiêu
-- Spec: projects/official/2026-year-1-plan-a/_specs/site-1-architecture.md v2 §2
-- Handoff: _master/handoffs/kiemtra-comparison-redesign/S1-redesign.md §3.1
-- Date: 2026-05-20 Day 39 evening (kiemtra v2 redesign S1)
--
-- 8 new columns added (idempotent: IF NOT EXISTS):
--   #8  security_headers_passed INT    Mozilla v2 tests_passed count
--   #9  hsts_preload BOOLEAN            HSTS header has 'preload' directive
--   #10 cls NUMERIC                     Cumulative Layout Shift (PSI mobile)
--   #11 lighthouse_accessibility INT    PSI accessibility category score 0-100
--   #12 js_bundle_kb INT                Estimated JS bundle size gzip KB
--   #13 webp_pct INT                    % images using WebP/AVIF format
--   #14 schema_has_faq BOOLEAN          FAQPage schema deployed
--   #15 schema_local_pack INT           Count of (LocalBusiness, Service, Person) found 0-3
--
-- Backward compat: existing 7 columns untouched. New columns NULL for cached pre-v2 audits
-- (24h TTL flushes naturally; force re-audit via {refresh: true} body param).

ALTER TABLE site1_audit_cache
  ADD COLUMN IF NOT EXISTS security_headers_passed INT,
  ADD COLUMN IF NOT EXISTS hsts_preload BOOLEAN,
  ADD COLUMN IF NOT EXISTS cls NUMERIC,
  ADD COLUMN IF NOT EXISTS lighthouse_accessibility INT,
  ADD COLUMN IF NOT EXISTS js_bundle_kb INT,
  ADD COLUMN IF NOT EXISTS webp_pct INT,
  ADD COLUMN IF NOT EXISTS schema_has_faq BOOLEAN,
  ADD COLUMN IF NOT EXISTS schema_local_pack INT;

COMMENT ON COLUMN site1_audit_cache.security_headers_passed IS 'Mozilla Observatory v2 tests_passed count (0-10) — chỉ tiêu #8';
COMMENT ON COLUMN site1_audit_cache.hsts_preload IS 'HSTS header includes preload directive — chỉ tiêu #9';
COMMENT ON COLUMN site1_audit_cache.cls IS 'Cumulative Layout Shift (PSI mobile) — chỉ tiêu #10';
COMMENT ON COLUMN site1_audit_cache.lighthouse_accessibility IS 'Lighthouse accessibility score 0-100 — chỉ tiêu #11';
COMMENT ON COLUMN site1_audit_cache.js_bundle_kb IS 'JS bundle size gzip estimate KB — chỉ tiêu #12';
COMMENT ON COLUMN site1_audit_cache.webp_pct IS 'Percent images using WebP/AVIF — chỉ tiêu #13';
COMMENT ON COLUMN site1_audit_cache.schema_has_faq IS 'FAQPage JSON-LD found — chỉ tiêu #14';
COMMENT ON COLUMN site1_audit_cache.schema_local_pack IS 'Count of {LocalBusiness, Service, Person} schemas — chỉ tiêu #15';
