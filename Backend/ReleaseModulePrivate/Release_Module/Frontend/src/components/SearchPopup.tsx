import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { dashboard, auth } from '../services/api';

interface SearchPopupProps {
  open: boolean;
  onClose: () => void;
}

export default function SearchPopup({ open, onClose }: SearchPopupProps) {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setQuery('');
      setError('');
      setSearching(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  const handleSearch = async () => {
    const trimmed = query.trim();
    if (!trimmed) return;
    setSearching(true);
    setError('');
    try {
      const session = auth.getSession();
      const userId = session.empCode;
      const res = await dashboard.searchById({ reqId: trimmed, userId });
      if (res.success && res.data) {
        onClose();
        // Handle array (reqId search) or single object (crfId/ticketId search)
        const item = Array.isArray(res.data) ? res.data[0] : res.data;
        if (!item) { setError('No record found'); setSearching(false); return; }

        const src = (item.source || '').toUpperCase();
        const cabExp = src.includes('CAB') ? 'CAB' : 'EXP';
        const _type = item.ticketId
          ? (cabExp === 'CAB' ? 'CAB_TICKET' : 'EXP_TICKET')
          : (cabExp === 'CAB' ? 'CAB_CRF' : 'EXP_CRF');

        // Build report object for ReportDetails page
        const report = {
          ...item,
          cabExp,
          _type,
          idDisplay: item.reqId || item.crfId || item.ticketId,
          statusText: (item.status || 'Unknown').toUpperCase(),
        };
        navigate('/Reports/Details', { state: { report } });
      } else {
        setError(res.message || 'No record found');
      }
    } catch {
      setError('Search failed. Please try again.');
    }
    setSearching(false);
  };

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-start justify-center pt-[15vh]" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-lg mx-4 animate-[fadeInUp_0.2s_ease-out]"
        onClick={e => e.stopPropagation()}
      >
        <div className="glass-panel rounded-2xl border border-white/10 shadow-2xl overflow-hidden">
          {/* Input */}
          <div className="flex items-center gap-3 px-5 py-4">
            <svg className="w-5 h-5 text-[#0084FF] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              ref={inputRef}
              type="text"
              placeholder="Enter REQ ID (e.g. AMFL101)"
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleSearch(); }}
              className="bg-transparent border-none outline-none text-white text-sm font-mono flex-1 placeholder:text-gray-500"
              disabled={searching}
            />
            {query && !searching && (
              <button onClick={() => { setQuery(''); setError(''); }} className="text-gray-500 hover:text-white transition-colors cursor-pointer">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            )}
            <button
              onClick={handleSearch}
              disabled={searching || !query.trim()}
              className="px-4 py-1.5 rounded-lg bg-[#0084FF]/20 text-[#0084FF] text-xs font-bold border border-[#0084FF]/30 hover:bg-[#0084FF]/30 transition-all cursor-pointer disabled:opacity-40"
            >
              {searching ? (
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
              ) : 'Search'}
            </button>
          </div>

          {/* Error */}
          {error && (
            <div className="px-5 pb-4">
              <div className="rounded-lg p-3 bg-red-500/10 border border-red-500/20">
                <p className="text-red-400 text-xs font-mono flex items-center gap-2">
                  <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  {error}
                </p>
              </div>
            </div>
          )}

          {/* Hint */}
          <div className="px-5 pb-3 flex items-center gap-4 text-[10px] text-gray-500 font-mono">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-gray-400">Enter</kbd> to search
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-gray-400">Esc</kbd> to close
            </span>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
