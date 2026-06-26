// BrandBar — copied from _master/_assets/shared-components/BrandBar.jsx
// Site 1 instance: current="kiem-tra"
// DO NOT EDIT — sync changes via canonical in _master/_assets/shared-components/
// S5B 2026-05-20 Day 39
export default function BrandBar({ current }) {
  const links = [
    { id: 'main', label: 'HAYWEB', href: 'https://hayweb.vn/', primary: true },
    { id: 'kiem-tra', label: 'Kiểm tra Web', href: 'https://kiem-tra.hayweb.vn/' },
    { id: 'hoc', label: 'Học SEO', href: 'https://hoc.hayweb.vn/' },
  ];
  return (
    <div className="bg-navy text-cream/80 py-2 px-4 text-[11px] font-mono tracking-wider border-b border-gold/20 hidden md:block">
      <div className="max-w-[1280px] mx-auto flex items-center gap-5">
        {links.map((link, idx) => {
          const isCurrent = current === link.id;
          const isExternal = !isCurrent;
          return (
            <span key={link.id} className="flex items-center gap-5">
              {idx > 0 && (
                <span className="text-cream/30" aria-hidden="true">·</span>
              )}
              <a
                href={link.href}
                className={`transition-colors ${
                  isCurrent
                    ? 'text-gold-champagne font-semibold'
                    : 'text-cream/70 hover:text-gold-champagne'
                } ${link.primary ? 'uppercase tracking-widest' : ''}`}
                aria-current={isCurrent ? 'page' : undefined}
              >
                {link.label}
                {isExternal && (
                  <span className="ml-1 text-gold/60" aria-hidden="true">↗</span>
                )}
              </a>
            </span>
          );
        })}
      </div>
    </div>
  );
}
