import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { dashboard, auth } from '../services/api';
import { motion, AnimatePresence } from 'framer-motion';

export default function HeaderSearch() {
  const navigate = useNavigate();
  const [isExpanded, setIsExpanded] = useState(false);
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isLight, setIsLight] = useState(false);

  useEffect(() => {
    setIsLight(document.documentElement.classList.contains('light'));
    const observer = new MutationObserver(() => {
      setIsLight(document.documentElement.classList.contains('light'));
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (isExpanded) {
      setTimeout(() => inputRef.current?.focus(), 100);
    } else {
      setQuery('');
      setError('');
      setResults([]);
    }
  }, [isExpanded]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsExpanded(false);
      }
    };
    if (isExpanded) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isExpanded]);

  // Auto-dismiss error after 5 seconds
  useEffect(() => {
    if (!error) return;
    const timer = setTimeout(() => setError(''), 5000);
    return () => clearTimeout(timer);
  }, [error]);

  const buildReport = (item: any) => {
    const src = (item.source || '').toUpperCase();
    const cabExp = src.includes('CAB') ? 'CAB' : 'EXP';
    const _type = item.ticketId
      ? (cabExp === 'CAB' ? 'CAB_TICKET' : 'EXP_TICKET')
      : (cabExp === 'CAB' ? 'CAB_CRF' : 'EXP_CRF');

    return {
      ...item,
      cabExp,
      _type,
      idDisplay: item.reqId || item.crfId || item.ticketId,
      statusText: (item.status || 'Unknown').toUpperCase(),
    };
  };

  const navigateToReport = (item: any) => {
    setIsExpanded(false);
    setResults([]);
    const report = buildReport(item);
    navigate('/Reports/Details', { state: { report } });
  };

  const getSourceLabel = (item: any) => {
    const src = (item.source || '').toUpperCase();
    if (item.ticketId) return `${src} TICKET`;
    return `${src} CRF`;
  };

  const getSourceColor = (item: any) => {
    const src = (item.source || '').toUpperCase();
    if (src.includes('CAB')) return isLight ? 'bg-blue-100 text-blue-700' : 'bg-blue-500/20 text-blue-400';
    return isLight ? 'bg-orange-100 text-orange-700' : 'bg-orange-500/20 text-orange-400';
  };

  const getStatusColor = (status: string) => {
    const s = (status || '').toUpperCase();
    if (s.includes('RELEASED') || s.includes('REVERT RELEASED')) return isLight ? 'text-emerald-600' : 'text-emerald-400';
    if (s.includes('APPROVED')) return isLight ? 'text-blue-600' : 'text-blue-400';
    if (s.includes('RETURN')) return isLight ? 'text-red-600' : 'text-red-400';
    if (s.includes('REVERT')) return isLight ? 'text-purple-600' : 'text-purple-400';
    if (s.includes('VERIFIED')) return isLight ? 'text-cyan-600' : 'text-cyan-400';
    if (s.includes('RECOMMENDED')) return isLight ? 'text-purple-600' : 'text-purple-400';
    return isLight ? 'text-amber-600' : 'text-amber-400';
  };

  const handleSearch = async () => {
    const trimmed = query.trim();
    if (!trimmed) return;
    setSearching(true);
    setError('');
    setResults([]);
    try {
      const isNumeric = /^\d+$/.test(trimmed);
      const session = auth.getSession();
      const userId = session.empCode;

      // 1) Always try reqId first (covers alphanumeric IDs like AMFL101)
      let res = await dashboard.searchById({ reqId: trimmed, userId });

      // 2) If not found and numeric, try crfId
      if (!res.success && isNumeric) {
        res = await dashboard.searchById({ crfId: parseInt(trimmed), userId });
      }

      // 3) If still not found and numeric, try ticketId
      if (!res.success && isNumeric) {
        res = await dashboard.searchById({ ticketId: parseInt(trimmed), userId });
      }

      if (res.success && res.data) {
        // reqId returns an array, crfId/ticketId returns a single object
        const items = Array.isArray(res.data) ? res.data : [res.data];

        if (items.length === 0) {
          setError('No record found');
        } else if (items.length === 1) {
          // Single result — navigate directly
          navigateToReport(items[0]);
        } else {
          // Multiple results — show the dropdown picker
          setResults(items);
        }
      } else {
        setError(res.message || 'No record found');
      }
    } catch {
      setError('Search failed. Please try again.');
    }
    setSearching(false);
  };

  return (
    <div className="relative flex items-center justify-end" ref={containerRef} style={{ zIndex: 50 }}>
      <motion.div
        initial={false}
        animate={{
          width: isExpanded ? 340 : 36,
          backgroundColor: isExpanded 
            ? (isLight ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.05)') 
            : 'transparent',
          borderColor: isExpanded 
            ? (isLight ? 'rgba(0,132,255,0.3)' : 'rgba(0,132,255,0.3)')
            : 'transparent'
        }}
        className={`flex items-center overflow-hidden rounded-full border transition-colors ${
          !isExpanded ? (isLight ? 'hover:bg-black/5 hover:text-[#0084FF] text-gray-500' : 'hover:bg-white/10 hover:text-[#0084FF] text-gray-400') : (isLight ? 'text-gray-800' : 'text-white')
        }`}
        style={{ height: '36px' }}
      >
        <button
          onClick={() => {
            if (isExpanded && query) handleSearch();
            else setIsExpanded(!isExpanded);
          }}
          disabled={searching}
          className="flex-shrink-0 w-[36px] h-[36px] flex items-center justify-center cursor-pointer disabled:opacity-50"
        >
          {searching ? (
            <svg className="w-4 h-4 text-[#0084FF] animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          ) : (
            <svg className={`w-4 h-4 ${isExpanded ? 'text-[#0084FF]' : 'currentColor'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          )}
        </button>

        <AnimatePresence>
          {isExpanded && (
            <motion.input
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              ref={inputRef}
              type="text"
              placeholder="Search CRF / TICKET / REQ ID..."
              value={query}
              onChange={(e) => { setQuery(e.target.value.toUpperCase()); setResults([]); setError(''); }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSearch();
                if (e.key === 'Escape') setIsExpanded(false);
              }}
              className="flex-1 bg-transparent border-none outline-none text-sm font-mono placeholder:text-gray-400 w-full pr-3 uppercase"
              disabled={searching}
            />
          )}
        </AnimatePresence>
      </motion.div>

      {/* Results Dropdown — shown when multiple matches found */}
      <AnimatePresence>
        {isExpanded && results.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className={`absolute top-[48px] right-0 w-80 rounded-xl shadow-2xl border backdrop-blur-xl overflow-hidden ${
              isLight ? 'bg-white/95 border-gray-200' : 'bg-slate-900/95 border-white/10'
            }`}
          >
            {/* Header */}
            <div className={`px-4 py-2.5 border-b ${isLight ? 'border-gray-100' : 'border-white/5'}`}>
              <p className={`text-[10px] font-mono uppercase tracking-widest ${isLight ? 'text-gray-400' : 'text-gray-500'}`}>
                {results.length} results found
              </p>
            </div>

            {/* Result Items */}
            <div className="max-h-64 overflow-y-auto">
              {results.map((item, idx) => (
                <button
                  key={idx}
                  onClick={() => navigateToReport(item)}
                  className={`w-full text-left px-4 py-3 flex items-center gap-3 transition-all cursor-pointer group ${
                    isLight
                      ? 'hover:bg-[#0084FF]/5 border-b border-gray-50 last:border-b-0'
                      : 'hover:bg-white/5 border-b border-white/5 last:border-b-0'
                  }`}
                >
                  {/* Source Badge */}
                  <span className={`text-[9px] font-bold tracking-wider px-2 py-1 rounded-md shrink-0 ${getSourceColor(item)}`}>
                    {getSourceLabel(item)}
                  </span>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs font-semibold truncate ${isLight ? 'text-gray-800' : 'text-white'}`}>
                      {item.subject || `ID: ${item.reqId || item.crfId || item.ticketId}`}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className={`text-[10px] font-mono ${isLight ? 'text-gray-400' : 'text-gray-500'}`}>
                        {item.reqId} • {item.ticketId ? `TKT-${item.ticketId}` : `CRF-${item.crfId}`}
                      </span>
                      <span className={`text-[10px] font-bold ${getStatusColor(item.status)}`}>
                        {item.status?.replace(/_/g, ' ') || 'UNKNOWN'}
                      </span>
                    </div>
                  </div>

                  {/* Arrow */}
                  <svg className={`w-3.5 h-3.5 shrink-0 opacity-0 group-hover:opacity-100 transform group-hover:translate-x-0.5 transition-all ${isLight ? 'text-[#0084FF]' : 'text-[#0084FF]'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error Dropdown */}
      <AnimatePresence>
        {isExpanded && error && results.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className={`absolute top-[48px] right-0 w-64 p-3 rounded-xl shadow-xl border backdrop-blur-md ${
              isLight ? 'bg-white/90 border-red-200' : 'bg-slate-900/90 border-red-500/20'
            }`}
          >
            <div className={`p-2 rounded-lg text-xs font-mono flex items-start gap-2 ${isLight ? 'bg-red-50 text-red-600' : 'bg-red-500/10 text-red-400'}`}>
              <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{error}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
