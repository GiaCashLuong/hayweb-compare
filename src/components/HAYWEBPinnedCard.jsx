// S5B 2026-05-20: bg-ink → bg-navy; accent → gold-champagne; top accent strip gold
import MetricRow from './MetricRow.jsx';
import { METRICS } from '../lib/audit.js';

export default function HAYWEBPinnedCard({ data }) {
  return (
    <div className="cell-card flex flex-col bg-navy text-cream border-navy relative overflow-hidden">
      {/* Gold accent strip on top — signals HAYWEB family premium tier */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gold" aria-hidden="true" />

      <header className="mb-3 flex items-center justify-between pt-2">
        <h3 className="text-sm uppercase tracking-wider text-cream/60">HAYWEB.vn</h3>
        <span className="text-xs text-gold-champagne uppercase tracking-wider">Đã pin</span>
      </header>

      <div className="mb-4 px-3 py-2.5 bg-cream/5 rounded border border-cream/10">
        <p className="text-xs text-cream/70 leading-relaxed">
          Số liệu cập nhật mỗi sáng 6h. Đại diện cho website áp dụng đủ
          7 chỉ tiêu cơ bản chuẩn 2026.
        </p>
      </div>

      <div className="border-t border-cream/20 pt-2 mt-auto [&_.text-pass]:!text-emerald-300 [&_.text-warn]:!text-amber-300 [&_.text-fail]:!text-red-300 [&_.text-ink\\/70]:!text-cream/70 [&_.text-ink\\/40]:!text-cream/40 [&_.border-rule]:!border-cream/15">
        {METRICS.map((m) => (
          <MetricRow key={m.key} metric={m} data={data} loading={!data} />
        ))}
      </div>
    </div>
  );
}
