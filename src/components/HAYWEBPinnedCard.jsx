import MetricRow from './MetricRow.jsx';
import { METRICS } from '../lib/audit.js';

export default function HAYWEBPinnedCard({ data }) {
  return (
    <div className="cell-card flex flex-col bg-ink text-bone border-ink">
      <header className="mb-3 flex items-center justify-between">
        <h3 className="text-sm uppercase tracking-wider text-bone/60">HAYWEB.vn</h3>
        <span className="text-xs text-accent uppercase tracking-wider">Đã pin</span>
      </header>

      <div className="mb-4 px-3 py-2.5 bg-bone/5 rounded border border-bone/10">
        <p className="text-xs text-bone/70 leading-relaxed">
          Số liệu cập nhật mỗi sáng 6h. Đại diện cho website áp dụng đủ
          7 chỉ tiêu cơ bản chuẩn 2026.
        </p>
      </div>

      <div className="border-t border-bone/20 pt-2 mt-auto [&_.text-pass]:!text-emerald-300 [&_.text-warn]:!text-amber-300 [&_.text-fail]:!text-red-300 [&_.text-ink\\/70]:!text-bone/70 [&_.text-ink\\/40]:!text-bone/40 [&_.border-rule]:!border-bone/15">
        {METRICS.map((m) => (
          <MetricRow key={m.key} metric={m} data={data} loading={!data} />
        ))}
      </div>
    </div>
  );
}
