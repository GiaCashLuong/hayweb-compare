import { useState } from 'react';
import MetricRow from './MetricRow.jsx';
import { METRICS } from '../lib/audit.js';

export default function URLInputCard({ slot, onAudit, status, data, error }) {
  const [value, setValue] = useState('');
  const loading = status === 'running';
  const cached = status === 'cached';
  const submit = (e) => {
    e.preventDefault();
    const v = value.trim();
    if (!v) return;
    onAudit(v);
  };

  return (
    <div className="cell-card flex flex-col">
      <header className="mb-3">
        <h3 className="text-sm uppercase tracking-wider text-ink/60">URL #{slot}</h3>
      </header>

      <form onSubmit={submit} className="flex flex-col gap-2 mb-4">
        <input
          type="url"
          inputMode="url"
          required
          disabled={loading}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="https://example.com"
          className="input-field text-sm"
          aria-label={`URL slot ${slot}`}
        />
        <button type="submit" disabled={loading} className="btn-primary text-sm py-2 disabled:opacity-40">
          {loading ? 'Đang đo…' : 'So sánh'}
        </button>
      </form>

      {error && (
        <div className="mb-3 text-sm text-fail bg-fail/5 border border-fail/30 rounded px-3 py-2">
          {humanizeError(error)}
        </div>
      )}

      <div className="border-t border-rule pt-2 mt-auto">
        {METRICS.map((m) => (
          <MetricRow key={m.key} metric={m} data={data} loading={loading && !data} />
        ))}
      </div>

      {cached && (
        <p className="text-xs text-ink/40 mt-2 italic">Kết quả từ cache 24h</p>
      )}
    </div>
  );
}

function humanizeError(code) {
  switch (code) {
    case 'invalid_url':
      return 'URL không hợp lệ. Kiểm tra lại định dạng.';
    case 'rate_limit':
      return 'Quá nhiều request từ IP này. Thử lại sau 1 giờ.';
    case 'audit_failed_500':
    case 'audit_failed_502':
      return 'Site không phản hồi hoặc chặn bot. Thử URL khác.';
    default:
      return 'Không đo được. Có thể site chặn bot hoặc unreachable.';
  }
}
