import { useEffect, useState } from 'react';
import ComparisonGrid from './components/ComparisonGrid.jsx';
import CTASection from './components/CTASection.jsx';
import LeadForm from './components/LeadForm.jsx';
import Disclaimer from './components/Disclaimer.jsx';

// PUBLIC: 7 BASIC chỉ tiêu only
// Advanced metrics intentionally hidden per _specs/advanced-chi-tieu-internal.md
// CONTACT sales for advanced framework discussion 1-on-1

function App() {
  const [formOpen, setFormOpen] = useState(false);

  useEffect(() => {
    if (!formOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e) => e.key === 'Escape' && setFormOpen(false);
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [formOpen]);

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-rule">
        <div className="max-w-container mx-auto px-5 md:px-8 py-4 flex items-center justify-between">
          <a href="/" className="font-headline text-2xl tracking-tight">
            <span className="italic">HAYWEB</span> <span className="text-ink/40 text-base">Compare</span>
          </a>
          <a href="https://hayweb.vn" className="text-sm text-ink/60 hover:text-ink">
            hayweb.vn ↗
          </a>
        </div>
      </header>

      <main className="flex-1 max-w-container w-full mx-auto px-5 md:px-8 py-10 md:py-16">
        <section className="mb-10 md:mb-14 max-w-3xl">
          <h1 className="mb-4">
            So sánh website của bạn <span className="text-accent italic">với HAYWEB</span>
          </h1>
          <p className="text-lg text-ink/70 leading-relaxed">
            Nhập 2 URL bất kỳ. HAYWEB.vn pinned cột 3 làm đối chiếu.
            7 chỉ tiêu kỹ thuật cơ bản mà mọi website chuyên nghiệp nên đạt.
            Kết quả trong 30-60 giây.
          </p>
        </section>

        <ComparisonGrid />

        <CTASection onOpenForm={() => setFormOpen(true)} />

        <Disclaimer />
      </main>

      {formOpen && (
        <div
          className="fixed inset-0 bg-ink/60 z-50 flex items-center justify-center p-4 overflow-y-auto"
          onClick={(e) => e.target === e.currentTarget && setFormOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Form liên hệ tư vấn"
        >
          <LeadForm onClose={() => setFormOpen(false)} />
        </div>
      )}
    </div>
  );
}

export default App;
