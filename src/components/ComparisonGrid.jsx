import { useEffect, useState } from 'react';
import URLInputCard from './URLInputCard.jsx';
import HAYWEBPinnedCard from './HAYWEBPinnedCard.jsx';
import { runAudit, getHaywebPinned } from '../lib/audit.js';

export default function ComparisonGrid() {
  const [slots, setSlots] = useState({
    1: { status: 'idle', data: null, error: null },
    2: { status: 'idle', data: null, error: null },
  });
  const [hayweb, setHayweb] = useState(null);

  useEffect(() => {
    let mounted = true;
    getHaywebPinned().then((d) => mounted && setHayweb(d));
    return () => { mounted = false; };
  }, []);

  const handleAudit = (slot) => async (url) => {
    setSlots((s) => ({ ...s, [slot]: { status: 'running', data: null, error: null } }));
    try {
      const data = await runAudit(url);
      setSlots((s) => ({ ...s, [slot]: { status: 'complete', data, error: null } }));
    } catch (err) {
      setSlots((s) => ({ ...s, [slot]: { status: 'error', data: null, error: err.message } }));
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
      <URLInputCard slot={1} onAudit={handleAudit(1)} {...slots[1]} />
      <URLInputCard slot={2} onAudit={handleAudit(2)} {...slots[2]} />
      <HAYWEBPinnedCard data={hayweb} />
    </div>
  );
}
