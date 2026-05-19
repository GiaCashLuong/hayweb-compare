import { useState } from 'react';
import { supabase } from '../lib/supabase.js';

const INDUSTRIES = [
  'B2B Services',
  'E-commerce',
  'F&B / Nhà hàng',
  'Spa / Beauty',
  'Y tế / Phòng khám',
  'Bất động sản',
  'Giáo dục',
  'Khác',
];

export default function LeadForm({ onClose }) {
  const [form, setForm] = useState({
    name: '',
    email: '',
    zalo: '',
    current_web: '',
    industry: '',
    website: '', // honeypot
  });
  const [status, setStatus] = useState('idle'); // idle | sending | success | error
  const [errorMsg, setErrorMsg] = useState('');

  const update = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim()) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      setErrorMsg('Email không hợp lệ.');
      return;
    }
    if (form.zalo && !/^0[0-9]{9,10}$/.test(form.zalo.replace(/\s/g, ''))) {
      setErrorMsg('Số Zalo không hợp lệ.');
      return;
    }

    setStatus('sending');
    setErrorMsg('');

    const payload = {
      name: form.name.trim(),
      email: form.email.trim(),
      zalo: form.zalo.trim() || null,
      current_web: form.current_web.trim() || null,
      industry: form.industry || null,
      source: 'site-1-comparison',
      user_agent: navigator.userAgent.slice(0, 240),
      honeypot_triggered: !!form.website,
    };

    const { error } = await supabase.from('site1_leads').insert(payload);
    if (error) {
      setStatus('error');
      setErrorMsg('Có lỗi xảy ra. Thử lại hoặc liên hệ qua Zalo 0xxx.');
      return;
    }
    setStatus('success');
  };

  if (status === 'success') {
    return (
      <div className="bg-bone border border-rule rounded-xl p-8 max-w-lg mx-auto text-center">
        <div className="text-4xl mb-3">✓</div>
        <h3 className="text-2xl mb-3">Đã nhận thông tin</h3>
        <p className="text-ink/70 mb-6">
          Founder Nguyễn Thế Quyền sẽ liên hệ trong 24h qua email
          hoặc Zalo bạn cung cấp.
        </p>
        <button onClick={onClose} className="btn-secondary">Đóng</button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="bg-bone border border-rule rounded-xl p-7 md:p-9 max-w-lg mx-auto">
      <h3 className="text-2xl mb-2">Tư vấn miễn phí về 3 chỉ tiêu nâng cao</h3>
      <p className="text-sm text-ink/60 mb-6">5 trường, gửi 1 lần. Founder trực tiếp xử lý.</p>

      <div className="space-y-4">
        <div>
          <label htmlFor="lf-name" className="block text-xs uppercase tracking-wider text-ink/60 mb-1">
            Họ tên *
          </label>
          <input id="lf-name" type="text" required minLength={2}
            value={form.name} onChange={update('name')} className="input-field" />
        </div>

        <div>
          <label htmlFor="lf-email" className="block text-xs uppercase tracking-wider text-ink/60 mb-1">
            Email *
          </label>
          <input id="lf-email" type="email" required
            value={form.email} onChange={update('email')} className="input-field" />
        </div>

        <div>
          <label htmlFor="lf-zalo" className="block text-xs uppercase tracking-wider text-ink/60 mb-1">
            Zalo (số điện thoại)
          </label>
          <input id="lf-zalo" type="tel" inputMode="tel" placeholder="09xxxxxxxx"
            value={form.zalo} onChange={update('zalo')} className="input-field" />
        </div>

        <div>
          <label htmlFor="lf-web" className="block text-xs uppercase tracking-wider text-ink/60 mb-1">
            Website hiện tại
          </label>
          <input id="lf-web" type="url" placeholder="https://..."
            value={form.current_web} onChange={update('current_web')} className="input-field" />
        </div>

        <div>
          <label htmlFor="lf-industry" className="block text-xs uppercase tracking-wider text-ink/60 mb-1">
            Ngành
          </label>
          <select id="lf-industry" value={form.industry} onChange={update('industry')} className="input-field">
            <option value="">— chọn ngành —</option>
            {INDUSTRIES.map((i) => <option key={i} value={i}>{i}</option>)}
          </select>
        </div>
      </div>

      {/* LAYER 5 honeypot per skills/code-protection.md */}
      <div aria-hidden="true" style={{ position: 'absolute', left: '-9999px', top: '-9999px', width: 1, height: 1, overflow: 'hidden' }}>
        <label htmlFor="lf-website">Website</label>
        <input type="text" id="lf-website" name="website" tabIndex={-1} autoComplete="off"
          value={form.website} onChange={update('website')} />
      </div>

      {errorMsg && <p className="mt-4 text-sm text-fail">{errorMsg}</p>}

      <div className="mt-7 flex flex-col sm:flex-row gap-3 sm:items-center">
        <button type="submit" disabled={status === 'sending'} className="btn-primary disabled:opacity-40">
          {status === 'sending' ? 'Đang gửi…' : 'Gửi yêu cầu tư vấn'}
        </button>
        <button type="button" onClick={onClose} className="text-sm text-ink/60 hover:text-ink underline">
          Đóng
        </button>
      </div>

      <p className="mt-5 text-xs text-ink/50">
        Bằng cách gửi, bạn đồng ý HAYWEB lưu thông tin để liên hệ tư vấn.
        Không spam, không chia sẻ với bên thứ 3.
      </p>
    </form>
  );
}
