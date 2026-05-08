import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { dashboard, auth, getRequirementTypeName } from "../../services/api";

export default function ExpReport() {
  const navigate = useNavigate();
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const session = auth.getSession();
  const isLight = document.documentElement.classList.contains('light');

  // Filters
  const [status, setStatus] = useState<number | 'ALL'>('ALL'); // Default to All
  const [fromDate, setFromDate] = useState<string>("");
  const [toDate, setToDate] = useState<string>("");

  const fetchedRef = useRef(false);

  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;
    loadReports();
  }, []);

  const loadReports = async () => {
    setLoading(true);
    try {
      // Format dates if needed (backend expects dd-MM-yyyy but HTML input type="date" gives yyyy-MM-dd)
      const formatForBackend = (dateStr: string) => {
        if (!dateStr) return undefined;
        const [y, m, d] = dateStr.split('-');
        return `${d}-${m}-${y}`;
      };

      const formattedFrom = formatForBackend(fromDate);
      const formattedTo = formatForBackend(toDate);

      const statusesToFetch = status === 'ALL' ? [5, 10, 0] : [status];
      const requests: Promise<any>[] = [];
      
      statusesToFetch.forEach(st => {
        requests.push(dashboard.getExpReport(st, session.empCode, formattedFrom, formattedTo));
        requests.push(dashboard.getTicketReport(st, session.empCode, formattedFrom, formattedTo));
      });

      const results = await Promise.allSettled(requests);

      const data: any[] = [];
      
      results.forEach((res, index) => {
        if (res.status === "fulfilled" && res.value?.success && Array.isArray(res.value.data)) {
          // Even indexes are ExpReport, odd are TicketReport in our push loop
          const isExpReport = index % 2 === 0;
          res.value.data.forEach((d: any) => {
            if (isExpReport) {
              data.push({ ...d, _type: 'EXP_CRF', idDisplay: d.crfId });
            } else if (d.ticketId || d.TicketId) {
              // GetTicketReport doesn't return cabExp — include all tickets with a ticketId
              data.push({ ...d, _type: 'EXP_TICKET', idDisplay: d.ticketId || d.TicketId });
            }
          });
        }
      });

      // Sort by Date descending (latest first)
      const parseDateStr = (dateStr: string) => {
        if (!dateStr) return 0;
        const parts = dateStr.split(' ');
        if (parts.length < 2) return new Date(dateStr).getTime() || 0;
        const [d, t] = parts;
        const [DD, MM, YYYY] = d.split('-');
        return new Date(`${YYYY}-${MM}-${DD}T${t}:00`).getTime() || 0;
      };

      data.sort((a, b) => {
        const timeA = parseDateStr(a.releasedDate || a.returnDate || a.createdDate);
        const timeB = parseDateStr(b.releasedDate || b.returnDate || b.createdDate);
        return timeB - timeA;
      });
      
      // Deduplicate by req_id (or fallback to crfId+type+status)
      const seen = new Set<string>();
      const unique = data.filter(item => {
        const key = (item.req_id || item.reqId || `${item._type}-${item.idDisplay}-${item.status}`);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      setReports(unique);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // Format date string to dd/mm/yyyy (strip time)
  function fmtDate(d: string | null | undefined): string {
    if (!d || d === 'N/A') return 'N/A';
    const clean = d.split(' ')[0];
    return clean.replace(/-/g, '/');
  }

  return (
    <div className={`min-h-screen theme-transition font-sans flex flex-col ${isLight ? 'bg-slate-50 text-slate-800' : 'bg-[#0F172A] text-slate-200'}`}>
      <div className="fixed top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-orange-500/10 via-transparent to-transparent pointer-events-none z-0"></div>
      
      {/* Header matching ExpDetails */}
      <header className={`w-full glass-header sticky top-0 z-50 border-b ${isLight ? 'border-gray-200 bg-white/80' : 'border-white/5'}`}>
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate('/Dashboard/Index')} className={`p-2 rounded-xl transition-colors group ${isLight ? 'hover:bg-black/5 text-gray-500 hover:text-gray-900' : 'hover:bg-white/5 text-gray-400 hover:text-white'}`}>
              <svg className="w-5 h-5 transform group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
            </button>
            <div className={`h-6 w-px ${isLight ? 'bg-black/10' : 'bg-white/10'}`}></div>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center border border-orange-500/20">
                <svg className="w-4 h-4 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
              </div>
              <div>
                <h1 className={`text-lg font-bold tracking-wide leading-tight ${isLight ? 'text-gray-900' : 'text-white'}`}>EXP Reports</h1>
                <p className="text-[10px] text-orange-400 font-mono tracking-wider uppercase">Analytics & History</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
             <div className="text-right">
                <p className={`text-sm font-medium ${isLight ? 'text-gray-800' : 'text-white'}`}>{session.empName || 'User'}</p>
                <p className="text-xs text-gray-500">{session.empCode || 'N/A'}</p>
             </div>
             <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center text-white font-bold shadow-lg">
                {session.empName?.substring(0, 2).toUpperCase() || 'U'}
             </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="w-full max-w-7xl mx-auto px-4 py-8 relative z-10 flex flex-col flex-1 gap-6">
        
        {/* Filtering Toolbar */}
        <div className="glass-panel rounded-2xl p-6 border border-white/10 flex flex-col xl:flex-row gap-6 items-start xl:items-end shrink-0 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-orange-500 via-red-500 to-transparent opacity-50"></div>
          
          <div className="flex-1 w-full grid grid-cols-1 md:grid-cols-2 xl:grid-cols-[1fr_auto] gap-8">
            
            {/* Status Pills */}
            <div className="space-y-3">
              <label className={`flex items-center gap-2 text-xs font-bold uppercase tracking-wider ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>
                <svg className="w-4 h-4 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                Report Status
              </label>
              <div className="flex flex-wrap gap-3">
                {[ 
                  { val: 'ALL', label: "All" },
                  { val: 5, label: "Released" },
                  { val: 10, label: "Revert Released" },
                  { val: 0, label: "Returned" }
                ].map(opt => (
                  <button
                    key={opt.val}
                    onClick={() => setStatus(opt.val as any)}
                    className={`px-5 py-2.5 rounded-xl text-sm font-bold tracking-wide transition-all ${
                      status === opt.val 
                        ? 'bg-orange-500 text-white shadow-[0_0_15px_rgba(249,115,22,0.3)] border border-orange-400' 
                        : isLight
                           ? 'bg-black/5 text-gray-700 border border-black/10 hover:bg-black/10 hover:text-black'
                           : 'bg-black/30 text-gray-400 border border-white/5 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Date Range */}
            <div className="space-y-3">
              <label className={`flex items-center gap-2 text-xs font-bold uppercase tracking-wider ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>
                <svg className="w-4 h-4 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                Date Range
              </label>
              <div className={`flex items-center gap-3 p-1.5 rounded-2xl border ${isLight ? 'bg-black/5 border-black/10' : 'bg-black/30 border-white/5'}`}>
                <div className="relative group flex-1">
                   <div className={`absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none group-focus-within:text-orange-400 transition-colors ${isLight ? 'text-black' : 'text-gray-500'}`}>
                     From
                   </div>
                   <input type="date" max={toDate || new Date().toISOString().split('T')[0]} value={fromDate} onChange={e => setFromDate(e.target.value)} className={`w-full bg-transparent rounded-xl pl-14 pr-4 py-2 text-sm outline-none focus:bg-black/5 transition-all font-mono ${isLight ? 'text-black' : 'text-gray-200'}`} style={{ colorScheme: isLight ? 'light' : 'dark' }} />
                </div>
                <div className="text-gray-600 font-bold px-1">→</div>
                <div className="relative group flex-1">
                   <div className={`absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none group-focus-within:text-orange-400 transition-colors ${isLight ? 'text-black' : 'text-gray-500'}`}>
                     To
                   </div>
                   <input type="date" min={fromDate} max={new Date().toISOString().split('T')[0]} value={toDate} onChange={e => setToDate(e.target.value)} className={`w-full bg-transparent rounded-xl pl-10 pr-4 py-2 text-sm outline-none focus:bg-black/5 transition-all font-mono ${isLight ? 'text-black' : 'text-gray-200'}`} style={{ colorScheme: isLight ? 'light' : 'dark' }} />
                </div>
              </div>
            </div>

          </div>

          <button onClick={loadReports} className="w-full xl:w-auto flex items-center justify-center gap-3 px-8 py-4 xl:py-3.5 bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-400 hover:to-red-500 text-white rounded-xl text-sm font-bold uppercase tracking-wider transition-all shadow-lg shadow-orange-500/20 hover:shadow-orange-500/40 hover:-translate-y-0.5">
            <svg className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
            Generate
          </button>
        </div>

        {/* Data Table */}
        <div className={`flex-1 glass-panel rounded-2xl border overflow-hidden flex flex-col ${isLight ? 'border-black/10' : 'border-white/10'}`}>
          {loading ? (
            <div className="flex-1 flex items-center justify-center py-20">
              <div className="w-8 h-8 rounded-full border-2 border-orange-500/20 border-t-orange-500 animate-spin"></div>
            </div>
          ) : reports.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center py-20 text-center">
              <div className="w-20 h-20 rounded-full bg-orange-500/5 flex items-center justify-center mb-6">
                <svg className="w-10 h-10 text-orange-500/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path>
                </svg>
              </div>
              <h2 className={`text-xl font-bold mb-2 ${isLight ? 'text-gray-900' : 'text-white'}`}>No Reports Found</h2>
              <p className="text-sm text-gray-400 max-w-md">No expedite tracking data was found matching your filter criteria.</p>
            </div>
          ) : (
            <div className="overflow-x-auto flex-1">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className={isLight ? 'bg-black/5 border-b border-black/10' : 'bg-white/5 border-b border-white/10'}>
                    <th className="p-4 text-xs font-bold text-gray-400 uppercase tracking-wider whitespace-nowrap">ID / REQ ID</th>
                    <th className="p-4 text-xs font-bold text-gray-400 uppercase tracking-wider whitespace-nowrap">Category</th>
                    <th className="p-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Subject & Details</th>
                    <th className="p-4 text-xs font-bold text-gray-400 uppercase tracking-wider whitespace-nowrap">Status</th>
                    <th className="p-4 text-xs font-bold text-gray-400 uppercase tracking-wider whitespace-nowrap">Action By</th>
                    <th className="p-4 text-xs font-bold text-gray-400 uppercase tracking-wider whitespace-nowrap">Action Date</th>
                    <th className="p-4 w-10 text-right"></th>
                  </tr>
                </thead>
                <tbody className={isLight ? 'divide-y divide-black/10' : 'divide-y divide-white/5'}>
                  {reports.map((row, i) => (
                    <tr key={`${row._type}-${row.idDisplay}-${i}`} className={`transition-colors ${isLight ? 'hover:bg-black/5' : 'hover:bg-white/5'}`}>
                      <td className="p-4 whitespace-nowrap">
                        <div className={`font-mono text-sm font-bold ${isLight ? 'text-gray-900' : 'text-white'}`}>{row.idDisplay}</div>
                        {(row.req_id || row.reqId) && (
                          <div className="text-[10px] text-orange-500 font-mono font-bold tracking-tight mt-0.5">{row.req_id || row.reqId}</div>
                        )}
                      </td>
                      <td className="p-4 whitespace-nowrap">
                        <div className="flex flex-col gap-1">
                          <span className="px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider bg-orange-500/10 text-orange-500 border border-orange-500/20 text-center">
                            {row._type === 'EXP_TICKET' ? 'TICKET' : 'CRF'}
                          </span>
                          <span className={`px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider text-center ${isLight ? 'bg-black/5 text-gray-600' : 'bg-white/5 text-gray-400'}`}>
                            {getRequirementTypeName(row.requirementType)}
                          </span>
                        </div>
                      </td>
                      <td className="p-4 min-w-[200px] max-w-[300px]">
                        <div className={`text-sm font-medium line-clamp-1 ${isLight ? 'text-gray-900' : 'text-white'}`} title={row.subject}>{row.subject || 'N/A'}</div>
                        <div className="text-[10px] text-gray-500 font-mono mt-0.5 truncate" title={row.changesToBeMade || row.reasonForExpedite}>
                          {row.changesToBeMade || row.reasonForExpedite || ''}
                        </div>
                      </td>
                      <td className="p-4 whitespace-nowrap">
                        <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border ${
                          String(row.statusText || row.status || '').toUpperCase().includes('REVERT') ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' :
                          String(row.statusText || row.status || '').toUpperCase().includes('RELEASE') ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' :
                          String(row.statusText || row.status || '').toUpperCase().includes('RETURN') ? 'bg-red-500/20 text-red-400 border-red-500/30' :
                          'bg-white/10 text-gray-300 border-white/20'
                        }`}>
                           {row.statusText || row.status || 'N/A'}
                        </span>
                      </td>
                      <td className="p-4 whitespace-nowrap">
                        {(() => {
                          const isReturn = String(row.statusText || row.status || '').toUpperCase().includes('RETURN');
                          // Flat fields: appReleasedByName, dbReleasedByName, or fallback nested/flat
                          const appName = row.appReleasedByName && row.appReleasedByName !== 'N/A' ? row.appReleasedByName : null;
                          const dbName = row.dbReleasedByName && row.dbReleasedByName !== 'N/A' ? row.dbReleasedByName : null;
                          const appId = row.appReleasedBy || null;
                          const dbId = row.dbReleasedBy || null;
                          const relObj = row.released;
                          const relName = appName || dbName || relObj?.app?.name || relObj?.db?.name || row.releasedByName || null;
                          const relId = appId || dbId || relObj?.app?.id || relObj?.db?.id || row.releasedBy || null;

                          const name = isReturn ? (row.returnByName || null) : relName;
                          const id = isReturn ? (row.returnBy || null) : relId;
                          const displayName = (name && name !== 'N/A') ? name : (id || 'N/A');
                          const showId = id && id !== 'N/A' && name && name !== 'N/A' && id !== name;
                          return (
                            <>
                              <div className={`text-sm font-medium ${isReturn ? 'text-red-400' : 'text-emerald-400'}`}>{displayName}</div>
                              {showId && <div className="text-[10px] text-gray-500 font-mono mt-0.5">{id}</div>}
                            </>
                          );
                        })()}
                      </td>
                      <td className="p-4 whitespace-nowrap">
                        <div className="text-xs text-gray-400 font-mono bg-black/20 px-2 py-1 rounded inline-block">
                          {fmtDate(row.releasedDate || row.returnDate || row.createdDate)}
                        </div>
                      </td>
                      <td className="p-4 whitespace-nowrap text-right">
                        <button onClick={() => navigate('/Reports/Details', { state: { report: row } })} className="px-3 py-1.5 rounded-lg bg-orange-500/10 border border-orange-500/20 hover:bg-orange-500/20 text-xs font-bold text-orange-400 transition-colors">Details</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
