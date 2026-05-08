import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import '../../assets/css/pages/release-history.css';
import { dashboard, auth, getRequirementTypeName } from '../../services/api';
import type { FlowTrackingItem } from '../../services/api';
import { DotLottiePlayer } from '@dotlottie/react-player';
import { motion, AnimatePresence } from 'framer-motion';

function ModernDropdown({ value, onChange, options, placeholder, isLight, focusColorClass }: { value: string, onChange: (v: string) => void, options: {value: string, label: string}[], placeholder: string, isLight: boolean, focusColorClass: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) setIsOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedOption = options.find(o => o.value === value) || { label: placeholder, value: '' };

  return (
    <div className="relative" ref={dropdownRef}>
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full cursor-pointer bg-black/40 border ${isOpen ? focusColorClass : 'border-white/10'} rounded-lg px-3 py-2 text-xs font-mono transition-colors flex items-center justify-between ${isLight ? 'text-black' : 'text-white'}`}
      >
        <span className={!value ? 'opacity-70' : ''}>{selectedOption.label}</span>
        <svg className={`w-3 h-3 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
      </div>
      
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className={`absolute z-50 mt-1 w-full rounded-lg shadow-xl border overflow-hidden ${isLight ? 'bg-[#ffffff] border-black/10' : 'bg-[#15181e] border-white/10'}`}
          >
            <div className="max-h-48 overflow-y-auto custom-scrollbar py-1">
              {options.map((opt) => (
                <div 
                  key={opt.value}
                  onClick={() => { onChange(opt.value); setIsOpen(false); }}
                  className={`px-3 py-2 text-xs font-mono cursor-pointer transition-colors flex items-center justify-between ${
                    value === opt.value 
                      ? (isLight ? 'bg-black/5 text-black font-bold' : 'bg-white/10 text-white font-bold') 
                      : (isLight ? 'text-gray-700 hover:bg-black/5' : 'text-gray-300 hover:bg-white/5 hover:text-white')
                  }`}
                >
                  {opt.label}
                  {value === opt.value && <svg className="w-3 h-3 text-[#10B981]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>}
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function History() {
  const [historyItems, setHistoryItems] = useState<(FlowTrackingItem & { _type: string })[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter state
  const [filters, setFilters] = useState({ dateFrom: '', dateTo: '', mode: '', status: '' });
  const [tempFilters, setTempFilters] = useState({ dateFrom: '', dateTo: '', mode: '', status: '' });
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);

  const session = auth.getSession();
  const isLight = document.documentElement.classList.contains('light');

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (filterRef.current && !filterRef.current.contains(event.target as Node)) {
        setIsFilterOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const t = sessionStorage.getItem('app-theme') || 'dark';
    if (t === 'light') { document.documentElement.classList.add('light'); }
    else { document.documentElement.classList.remove('light'); }

    fetchHistory();
  }, []);

  async function fetchHistory() {
    if (!session.empCode) return;
    setLoading(true);

    try {
      const res = await dashboard.getCombinedReport();

      type HistoryRow = {
        crfId?: number; ticketId?: number; reqId?: string; _type: string;
        userName: string; userId: number | string;
        releasedBy: string; releasedById: number | string;
        releasedDate: string; status: string; cabExp: string; _rawDate?: string;
      };

      let allItems: HistoryRow[] = [];

      if (res.success && res.data && Array.isArray(res.data)) {
        allItems = res.data.map((d: any) => {
          const isTicket = d.source === 'TICKET';
          const isCab = d.source === 'CAB' || (isTicket && d.requirementType === 2);
          const typeStr = isTicket ? (isCab ? 'CAB_TICKET' : 'EXP_TICKET') : (isCab ? 'CAB' : 'EXP');

          // Format ISO date to DD/MM/YYYY and HH:mm
          let formattedDate = 'N/A';
          let formattedTime = '';
          let rawDate = d.releasedDate;
          if (rawDate) {
            const dateObj = new Date(rawDate);
            if (!isNaN(dateObj.getTime())) {
              formattedDate = `${dateObj.getDate().toString().padStart(2, '0')}/${(dateObj.getMonth() + 1).toString().padStart(2, '0')}/${dateObj.getFullYear()}`;
              formattedTime = `${dateObj.getHours().toString().padStart(2, '0')}:${dateObj.getMinutes().toString().padStart(2, '0')}`;
            }
          }

            // Extract released person from flat fields or nested object
            const appName = d.appReleasedByName && d.appReleasedByName !== 'N/A' ? d.appReleasedByName : null;
            const dbName = d.dbReleasedByName && d.dbReleasedByName !== 'N/A' ? d.dbReleasedByName : null;
            const relObj = d.released;
            const relName = appName || dbName || relObj?.app?.name || relObj?.db?.name || d.releasedByName || d.releasedBy || 'N/A';
            const relId = d.appReleasedBy || d.dbReleasedBy || relObj?.app?.id || relObj?.db?.id || d.releasedBy || 'N/A';

            return {
            crfId: d.crfId,
            ticketId: d.ticketId,
            reqId: d.req_id || d.crfId || d.ticketId,
            _type: typeStr,
            userName: d.userName || d.recommender || 'Unknown',
            userId: d.userId || 'N/A',
            releasedBy: relName,
            releasedById: relId,
            releasedDate: formattedDate,
            releasedTime: formattedTime,
            requirementType: d.requirementType,
            _rawDate: rawDate,
            status: d.isRevert ? 'REVERT RELEASED' : 'RELEASED',
            cabExp: typeStr,
          };
        });

        // Apply Date Filters locally since getCombinedReport returns everything
        if (filters.dateFrom || filters.dateTo) {
          const fromTime = filters.dateFrom ? new Date(filters.dateFrom).getTime() : 0;
          const toTime = filters.dateTo ? new Date(filters.dateTo + 'T23:59:59.999Z').getTime() : Infinity;

          allItems = allItems.filter(item => {
            if (!item._rawDate) return true; 
            const itemTime = new Date(item._rawDate).getTime();
            if (isNaN(itemTime)) return true;
            return itemTime >= fromTime && itemTime <= toTime;
          });
        }
      }

      // Sort by release date descending (newest first)
      allItems.sort((a: any, b: any) => {
        const timeA = a._rawDate ? new Date(a._rawDate).getTime() : 0;
        const timeB = b._rawDate ? new Date(b._rawDate).getTime() : 0;
        return timeB - timeA;
      });

      setHistoryItems(allItems as any);
    } catch (e) {
      console.error("Failed to load history", e);
    } finally {
      setLoading(false);
    }
  }

  // Filter Data (mode and status are client-side, dates are sent to backend)
  const filteredItems = historyItems.filter((row: any) => {
    let match = true;
    if (filters.mode && row._type !== filters.mode) match = false;
    if (filters.status === 'RELEASED' && row.status !== 'RELEASED') match = false;
    if (filters.status === 'REVERTED' && row.status !== 'REVERT RELEASED') match = false;
    if (filters.status === 'RETURNED' && row.status !== 'RETURNED') match = false;
    return match;
  });

  // Calculate statistics based on filtered items
  const totalReleased = filteredItems.length;
  const cabReleases = filteredItems.filter((h: any) => h._type === 'CAB' || h._type === 'CAB_TICKET').length;
  const expReleases = filteredItems.filter((h: any) => h._type === 'EXP' || h._type === 'EXP_TICKET').length;
  const returnedCount = filteredItems.filter((h: any) => h.status === 'RETURNED').length;

  const handleApplyFilter = () => {
    setFilters(tempFilters);
    setIsFilterOpen(false);
    // Re-fetch with new date filters
    setTimeout(() => fetchHistory(), 0);
  };

  const handleClearFilters = () => {
    const empty = { dateFrom: '', dateTo: '', mode: '', status: '' };
    setTempFilters(empty);
    setFilters(empty);
    setIsFilterOpen(false);
  };

  const removeFilter = (key: keyof typeof filters) => {
    const updated = { ...filters, [key]: '' };
    setFilters(updated);
    setTempFilters(updated);
  };

  return (
    <div className="h-screen w-full flex overflow-hidden text-slate-200">
      {/* Left Sidebar */}
      <aside className="flex-none w-72 p-4 flex flex-col h-full z-20">
        <div className="glass-panel flex-1 rounded-2xl flex flex-col overflow-hidden relative fade-in">
          <div className="p-6 border-b border-white/5 flex items-center gap-4">
            <div className="relative group cursor-pointer">
              <div className="h-12 w-12 rounded-full bg-gradient-to-br from-[#0084FF] to-purple-600 flex items-center justify-center p-2">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/></svg>
              </div>
              <div className="absolute inset-0 rounded-full border border-[#10B981] opacity-0 group-hover:opacity-100 group-hover:animate-ping"></div>
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-bold text-white tracking-widest uppercase">Release</span>
              <span className="text-[0.65rem] font-bold tracking-[0.2em] text-[#10B981] uppercase">Release Operations</span>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            <Link to="/Dashboard/Release" className="flex items-center gap-3 px-4 py-3 rounded-xl text-gray-400 hover:text-white hover:bg-white/5 transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"></path></svg>
              Action Queue
            </Link>
            <span className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/10 text-white font-medium shadow-[0_0_15px_rgba(255,255,255,0.05)] border border-white/10 cursor-default">
              <svg className="w-5 h-5 text-[#10B981]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
              Release History
            </span>
          </div>
          {/* Statistics Grid */}
          <div className="p-4 grid grid-cols-2 gap-3 mt-auto">
            <div className="glass-panel p-4 rounded-xl text-center relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <p className="text-[9px] uppercase tracking-widest text-gray-400 font-mono mb-1">Total Released</p>
              <h2 className="text-2xl font-semibold text-emerald-400">{totalReleased}</h2>
            </div>
            <div className="glass-panel p-4 rounded-xl text-center relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-br from-[#0084FF]/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <p className="text-[9px] uppercase tracking-widest text-gray-400 font-mono mb-1">CAB Releases</p>
              <h2 className="text-2xl font-semibold text-[#0084FF]">{cabReleases}</h2>
            </div>
            <div className="glass-panel p-4 rounded-xl text-center relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <p className="text-[9px] uppercase tracking-widest text-gray-400 font-mono mb-1">Expedite</p>
              <h2 className="text-2xl font-semibold text-amber-400">{expReleases}</h2>
            </div>
            <div className="glass-panel p-4 rounded-xl text-center relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-br from-red-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <p className="text-[9px] uppercase tracking-widest text-gray-400 font-mono mb-1">Returned</p>
              <h2 className="text-2xl font-semibold text-red-400">{returnedCount}</h2>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-full relative z-10 p-4 pl-0">
        <header className="glass-header rounded-2xl p-6 flex justify-between items-center mb-4 fade-in shadow-lg shrink-0 z-20">
          <div>
            <h1 className="text-2xl font-light tracking-wide text-white">Release History</h1>
            <p className="text-xs text-gray-400 font-mono mt-1">Past Release Records</p>
          </div>
          <div className="flex items-center gap-3">
            {/* Filter Chips */}
            <div className="flex items-center gap-2 mr-2">
              {filters.dateFrom && (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-mono">
                  <span>From: {filters.dateFrom}</span>
                  <button onClick={() => removeFilter('dateFrom')} className="hover:text-white transition-colors"><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg></button>
                </div>
              )}
              {filters.dateTo && (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-mono">
                  <span>To: {filters.dateTo}</span>
                  <button onClick={() => removeFilter('dateTo')} className="hover:text-white transition-colors"><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg></button>
                </div>
              )}
              {filters.mode && (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#0084FF]/10 border border-[#0084FF]/20 text-[#0084FF] text-xs font-mono">
                  <span>Mode: {filters.mode.replace('_', ' ')}</span>
                  <button onClick={() => removeFilter('mode')} className="hover:text-white transition-colors"><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg></button>
                </div>
              )}
              {filters.status && (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-500 text-xs font-mono">
                  <span>Status: {filters.status}</span>
                  <button onClick={() => removeFilter('status')} className="hover:text-white transition-colors"><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg></button>
                </div>
              )}
            </div>

            {/* Filter Toggle Button */}
            <div className="relative" ref={filterRef}>
              <button
                onClick={() => {
                  setTempFilters(filters);
                  setIsFilterOpen(!isFilterOpen);
                }}
                className={`p-2.5 rounded-xl border transition-all ${isFilterOpen || Object.values(filters).some(v => v) ? 'bg-[#10B981]/20 border-[#10B981]/50 text-[#10B981]' : 'bg-white/5 border-white/10 text-gray-400 hover:text-white hover:bg-white/10 hover:border-white/20'}`}
                title="Filters"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"></path>
                </svg>
              </button>

              {/* Filter Popover */}
              {isFilterOpen && (
                <div className="absolute right-0 top-full mt-3 w-80 glass-panel border border-white/10 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.5)] z-50 fade-in">
                  <div className="p-4 border-b border-white/10 flex justify-between items-center bg-white/5 rounded-t-2xl">
                    <h3 className="font-bold text-white tracking-widest uppercase text-xs">Filter Records</h3>
                    <button onClick={handleClearFilters} className="text-[10px] uppercase tracking-widest text-[#10B981] hover:text-white transition-colors font-mono font-bold">Clear All</button>
                  </div>
                  <div className="p-5 space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] text-gray-400 uppercase tracking-wider font-mono mb-1.5">From Date</label>
                        <input
                          type="date"
                          max={tempFilters.dateTo || new Date().toISOString().split('T')[0]}
                          value={tempFilters.dateFrom}
                          onChange={e => setTempFilters({ ...tempFilters, dateFrom: e.target.value })}
                          className={`w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-xs font-mono focus:border-[#10B981] focus:outline-none transition-colors ${isLight ? 'text-black' : 'text-white'}`}
                          style={{ colorScheme: isLight ? 'light' : 'dark' }}
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-gray-400 uppercase tracking-wider font-mono mb-1.5">To Date</label>
                        <input
                          type="date"
                          min={tempFilters.dateFrom}
                          max={new Date().toISOString().split('T')[0]}
                          value={tempFilters.dateTo}
                          onChange={e => setTempFilters({ ...tempFilters, dateTo: e.target.value })}
                          className={`w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-xs font-mono focus:border-[#10B981] focus:outline-none transition-colors ${isLight ? 'text-black' : 'text-white'}`}
                          style={{ colorScheme: isLight ? 'light' : 'dark' }}
                        />
                      </div>
                    </div>
                    {/* Modern Dropdowns */}
                    <div>
                      <label className="block text-[10px] text-gray-400 uppercase tracking-wider font-mono mb-1.5">Request Mode</label>
                      <ModernDropdown 
                        value={tempFilters.mode}
                        onChange={(v) => setTempFilters({ ...tempFilters, mode: v })}
                        options={[
                          { value: '', label: 'All Modes' },
                          { value: 'EXP', label: 'EXP' },
                          { value: 'CAB', label: 'CAB' },
                          { value: 'CAB_TICKET', label: 'CAB TICKET' },
                          { value: 'EXP_TICKET', label: 'EXP TICKET' }
                        ]}
                        placeholder="All Modes"
                        isLight={isLight}
                        focusColorClass="border-[#0084FF]"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-gray-400 uppercase tracking-wider font-mono mb-1.5">Status</label>
                      <ModernDropdown 
                        value={tempFilters.status}
                        onChange={(v) => setTempFilters({ ...tempFilters, status: v })}
                        options={[
                          { value: '', label: 'All Statuses' },
                          { value: 'RELEASED', label: 'Released' },
                          { value: 'REVERTED', label: 'Reverted' },
                          { value: 'RETURNED', label: 'Returned' }
                        ]}
                        placeholder="All Statuses"
                        isLight={isLight}
                        focusColorClass="border-amber-500"
                      />
                    </div>
                  </div>
                  <div className="p-4 border-t border-white/10 bg-black/40 flex justify-end gap-3 rounded-b-2xl">
                    <button onClick={() => setIsFilterOpen(false)} className="px-4 py-2 rounded-lg text-xs font-bold text-gray-400 hover:text-white transition-colors uppercase tracking-widest">Cancel</button>
                    <button onClick={handleApplyFilter} className="px-4 py-2 rounded-lg text-xs font-bold bg-[#10B981] hover:bg-[#059669] text-white transition-colors uppercase tracking-widest shadow-[0_0_15px_rgba(16,185,129,0.3)]">Apply Filter</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        <div className="flex-1 flex gap-4 min-h-0 fade-in-delay-1">
          <div className="glass-panel rounded-2xl flex-1 p-6 flex flex-col min-h-0 overflow-hidden relative">

            {loading ? (
              <div className="flex-1 flex flex-col items-center justify-center">
                <div className="w-32 h-32 mb-4"><DotLottiePlayer src={`${import.meta.env.BASE_URL}loading.lottie`} autoplay loop /></div>
                <div className="text-gray-400 font-mono text-sm animate-pulse">Fetching history records...</div>
              </div>
            ) : historyItems.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center">
                <div className="text-gray-500 font-mono text-sm">No release history found.</div>
              </div>
            ) : (
              <div className="flex-1 overflow-auto pr-2">
                <table className="history-table">
                  <thead>
                    <tr><th>ID</th><th>Mode</th><th>Requested By</th><th>Released By</th><th>Date</th><th>Status</th></tr>
                  </thead>
                  <tbody>
                    {filteredItems.map((row: any) => (
                      <tr key={`${row._type}_${row.reqId || row.crfId || row.ticketId}`} className="history-row">
                        <td>
                          <div className="font-mono text-white text-sm">{row.reqId || row.crfId || row.ticketId}</div>
                          {row.reqId && (row.crfId || row.ticketId) && (
                            <div className="text-xs text-gray-500 font-mono mt-0.5">{row.crfId || row.ticketId}</div>
                          )}
                        </td>
                        <td>
                          <span className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${row._type.includes('CAB') ? 'bg-[#0084FF]/20 text-[#0084FF] border border-[#0084FF]/30' : 'bg-amber-500/20 text-amber-500 border border-amber-500/30'}`}>{row._type.replace('_', ' ')}</span>
                          {row.requirementType != null && <div className="text-[10px] text-gray-500 font-mono mt-1">{getRequirementTypeName(row.requirementType)}</div>}
                        </td>
                        <td>
                          <div className="text-sm font-medium text-white max-w-[200px] truncate" title={row.userName}>{row.userName}</div>
                          <div className="text-xs text-gray-400 font-mono mt-0.5" title={row.userId.toString()}>{row.userId}</div>
                        </td>
                        <td>
                          <div className="text-sm text-gray-300 max-w-[200px] truncate" title={row.releasedBy}>{row.releasedBy}</div>
                          <div className="text-xs text-gray-500 font-mono mt-0.5" title={row.releasedById.toString()}>{row.releasedById}</div>
                        </td>
                        <td>
                          <div className="text-sm text-gray-300 font-mono">{row.releasedDate?.split(' ')[0].replace(/-/g, '/')}</div>
                          {row.releasedTime && <div className="text-[10px] text-gray-500 font-mono mt-0.5">{row.releasedTime}</div>}
                        </td>
                        <td>
                          <span className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${row.status.includes('REVERT') ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' :
                              row.status.includes('RELEASED') ? 'bg-emerald-500/20 text-emerald-500 border border-emerald-500/30' :
                                'bg-red-500/20 text-red-500 border border-red-500/30'
                            }`}>
                            {row.status === 'REVERT RELEASED' ? 'REVERTED' : row.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
