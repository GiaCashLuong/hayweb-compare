// PUBLIC: 7 BASIC chỉ tiêu only
// Advanced metrics intentionally hidden per _specs/advanced-chi-tieu-internal.md

const STATE_STYLE = {
  pass: 'badge-pass',
  warn: 'badge-warn',
  fail: 'badge-fail',
  unknown: 'text-ink/40',
};

const STATE_ICON = {
  pass: '✓',
  warn: '!',
  fail: '✕',
  unknown: '…',
};

export default function MetricRow({ metric, data, loading }) {
  if (loading) {
    return (
      <div className="flex justify-between items-center py-2.5 border-b border-rule last:border-0">
        <span className="text-sm text-ink/70">{metric.short}</span>
        <span className="text-sm text-ink/30 italic">đang đo…</span>
      </div>
    );
  }
  const { state, value } = metric.evaluate(data);
  return (
    <div className="flex justify-between items-center py-2.5 border-b border-rule last:border-0 gap-3">
      <span className="text-sm text-ink/70 shrink-0">{metric.short}</span>
      <span className={`text-sm tabular-nums text-right ${STATE_STYLE[state]}`}>
        <span aria-hidden="true">{STATE_ICON[state]}</span> {value}
      </span>
    </div>
  );
}
