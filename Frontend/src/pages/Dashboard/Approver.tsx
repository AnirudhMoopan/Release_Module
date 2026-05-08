import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { DotLottiePlayer } from "@dotlottie/react-player";
import { dashboard, auth, getRequirementTypeName } from "../../services/api";
import type { PendingRequestItem } from "../../services/api";
import HeaderSearch from "../../components/HeaderSearch";
import '../../assets/css/pages/approver-dashboard.css';

export default function ApproverDashboard() {
  const navigate = useNavigate();
  const [activeFilter, setActiveFilter] = useState<"EXP" | "CAB">("EXP");
  const [isLight, setIsLight] = useState(() => document.documentElement.classList.contains('light'));
  const [expQueue, setExpQueue] = useState<(PendingRequestItem & { _isRevert?: boolean; _releaseType?: string })[]>([]);
  const [cabQueue, setCabQueue] = useState<(PendingRequestItem & { _isRevert?: boolean; _releaseType?: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloadingReport, setDownloadingReport] = useState(false);
  const expBtnRef = useRef<HTMLButtonElement>(null);
  const cabBtnRef = useRef<HTMLButtonElement>(null);
  const hasFetched = useRef(false);

  const session = auth.getSession();

  const toggleTheme = () => {
    const root = document.documentElement;
    const isNowLight = root.classList.toggle('light');
    sessionStorage.setItem('app-theme', isNowLight ? 'light' : 'dark');
    setIsLight(isNowLight);
  };

  useEffect(() => {
    const t = sessionStorage.getItem('app-theme') || 'dark';
    if (t === 'light') { document.documentElement.classList.add('light'); setIsLight(true); }
    else { document.documentElement.classList.remove('light'); setIsLight(false); }
  }, []);

  // Fetch pending items + revert items based on user's stepOrder
  const loadQueue = async (showLoading = false) => {
    if (!session.empCode) return;
    if (showLoading) setLoading(true);

    const emp = session.empCode;
    const step = session.stepOrder;
    const fallback = { success: false, message: "", data: [] as any[] };

    // Pick the right endpoint per stepOrder
    const pick = (s1: () => Promise<any>, s2: () => Promise<any>, s3: () => Promise<any>) => {
      if (step === 1) return s1();
      if (step === 2) return s2();
      if (step === 3) return s3();
      return Promise.resolve(fallback);
    };

    // Fire ALL 8 requests in parallel instead of sequentially
    const [res, revertRes, expTicketRes, expTicketRevertRes, cabCrfRes, cabTicketRes, cabRevertRes, cabTicketRevertRes] = await Promise.all([
      pick(() => dashboard.getRecommendation(emp), () => dashboard.getVerify(emp), () => dashboard.getApprove(emp)),
      pick(() => dashboard.getRevertRecommendation(emp), () => dashboard.getRevertVerify(emp), () => dashboard.getRevertApprove(emp)),
      pick(() => dashboard.getExpTicketRecommendation(emp), () => dashboard.getExpTicketVerify(emp), () => dashboard.getExpTicketApprove(emp)),
      pick(() => dashboard.getExpTicketRevertRecommendation(emp), () => dashboard.getExpTicketRevertVerify(emp), () => dashboard.getExpTicketRevertApprove(emp)),
      pick(() => dashboard.getCabCrfRecommendation(emp), () => dashboard.getCabCrfVerify(emp), () => dashboard.getCabCrfApprove(emp)),
      pick(() => dashboard.getCabTicketRecommendation(emp), () => dashboard.getCabTicketVerify(emp), () => dashboard.getCabTicketApprove(emp)),
      pick(() => dashboard.getCabRevertRecommendation(emp), () => dashboard.getCabRevertVerify(emp), () => dashboard.getCabRevertApprove(emp)),
      pick(() => dashboard.getCabTicketRevertRecommendation(emp), () => dashboard.getCabTicketRevertVerify(emp), () => dashboard.getCabTicketRevertApprove(emp)),
    ]);

    const extract = (r: any) => (r.success && r.data && Array.isArray(r.data)) ? r.data : [];

    // Deduplicate by ticketId/crfId + reqId to handle any DB-level duplicates
    const dedup = (items: any[]) => {
      const seen = new Set<string>();
      return items.filter((item: any) => {
        const key = `${item.ticketId || item.crfId}_${item.reqId || ''}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    };

    const expItems = dedup([
      ...extract(res).map((item: any) => ({ ...item, _releaseType: 'EXP_CRF' as const })),
      ...extract(revertRes).map((item: any) => ({ ...item, _isRevert: true as const, _releaseType: 'EXP_CRF' as const })),
      ...extract(expTicketRes).map((item: any) => ({ ...item, _releaseType: 'EXP_TICKET' as const })),
      ...extract(expTicketRevertRes).map((item: any) => ({ ...item, _isRevert: true as const, _releaseType: 'EXP_TICKET' as const })),
    ]);
    expItems.sort((a: any, b: any) => (a.crfId || a.ticketId || 0) - (b.crfId || b.ticketId || 0));
    setExpQueue(expItems);

    const cabItems = dedup([
      ...extract(cabCrfRes).map((item: any) => ({ ...item, _releaseType: 'CAB_CRF' as const })),
      ...extract(cabTicketRes).map((item: any) => ({ ...item, _releaseType: 'CAB_TICKET' as const })),
      ...extract(cabRevertRes).map((item: any) => ({ ...item, _isRevert: true as const, _releaseType: 'CAB_CRF' as const })),
      ...extract(cabTicketRevertRes).map((item: any) => ({ ...item, _isRevert: true as const, _releaseType: 'CAB_TICKET' as const })),
    ]);
    cabItems.sort((a: any, b: any) => (a.crfId || a.ticketId || 0) - (b.crfId || b.ticketId || 0));
    setCabQueue(cabItems);

    setLoading(false);
  };

  useEffect(() => {
    if (hasFetched.current) return;
    hasFetched.current = true;
    loadQueue(true);
  }, []);

  const roleLabel = session.stepOrder === 1 ? "Recommendation" : session.stepOrder === 2 ? "Verification" : "Approval";

  const expCount = expQueue.length;
  const cabCount = cabQueue.length;
  const filteredQueue = activeFilter === "EXP" ? expQueue : cabQueue;

  return (
    <div className="h-screen w-full flex flex-col p-6 z-10 relative">
      {/* Header */}
      <header className="glass-header rounded-2xl p-6 flex justify-between items-center mb-6 fade-in shadow-lg shrink-0 relative z-50">
        <div className="flex items-center gap-4">
          <div className={`w-12 h-12 rounded-full flex items-center justify-center p-2 shadow-lg border ${isLight ? 'bg-white border-black/10' : 'bg-black/40 border-white/20'}`}>
            <div className="h-full w-full rounded-full bg-gradient-to-br from-[#0084FF] to-purple-600 flex items-center justify-center relative z-10">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/></svg>
            </div>
          </div>
          <div>
            <h1 className="text-2xl font-light tracking-wide text-white">{roleLabel} Queue</h1>
            <p className="text-xs text-gray-400 font-mono mt-1">Pending {roleLabel} • {session.empName}</p>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-full bg-gradient-to-tr flex items-center justify-center ring-2 cursor-default hover:scale-105 transition-transform ${isLight ? 'from-purple-500 to-[#0084FF] shadow-[0_0_12px_rgba(0,132,255,0.2)] ring-white' : 'from-purple-600 to-[#0084FF] shadow-[0_0_12px_rgba(0,132,255,0.3)] ring-white/5'}`}>
              <span className="text-white font-bold text-xs tracking-wider">{session.empName?.substring(0, 2).toUpperCase() || "U"}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-bold text-white leading-none">{session.empName || 'User'}</span>
              <span className="text-[10px] text-gray-500 font-mono mt-1 leading-none">{session.empCode || 'N/A'}</span>
            </div>
          </div>

          <div className={`h-6 w-px ${isLight ? 'bg-black/10' : 'bg-white/10'}`}></div>

          <HeaderSearch />
          
          <button onClick={toggleTheme} aria-label="Toggle theme" title="Toggle Theme" className={`relative p-2.5 transition-colors rounded-full cursor-pointer group border shadow-inner ${isLight ? 'text-gray-500 hover:text-[#0084FF] bg-black/5 hover:bg-[#0084FF]/10 border-black/10' : 'text-gray-400 hover:text-[#0084FF] bg-white/5 hover:bg-[#0084FF]/10 border-white/5'}`}>
            {!isLight ? (
              <svg className="w-4 h-4 group-hover:rotate-45 transition-transform duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
            ) : (
              <svg className="w-4 h-4 group-hover:rotate-45 transition-transform duration-300" fill="currentColor" viewBox="0 0 24 24"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" /></svg>
            )}
          </button>
          
          <button onClick={() => { auth.logout(); navigate('/Login'); }} className="flex items-center gap-2 px-4 py-2 rounded-lg text-[10px] font-bold text-red-400 bg-red-500/10 hover:bg-red-500 hover:text-white border border-red-500/20 hover:border-red-500 transition-all tracking-widest uppercase">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg>
            Sign Out
          </button>
        </div>
      </header>

      {/* Main List */}
      <div className="glass-panel rounded-2xl flex-1 p-8 flex flex-col min-h-0 fade-in w-full max-w-7xl mx-auto mb-10 overflow-hidden">
        <div className="flex justify-between items-center mb-6 shrink-0">
          <h3 className="text-lg tracking-wide font-medium text-white flex items-center gap-3">
            <span className="w-2 h-2 rounded-full bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.8)] animate-pulse"></span>
            Action Required
          </h3>

          <div className="flex items-center gap-4">
            <button onClick={() => loadQueue(true)} className="p-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-gray-400 hover:text-white transition-all cursor-pointer" title="Refresh Queue">
              <svg className={`w-5 h-5 ${loading ? 'animate-spin [animation-direction:reverse] text-[#0084FF]' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
            </button>
            <div id="filter-container" className={`relative flex items-center p-1.5 rounded-2xl shadow-inner border gap-1 ${isLight ? 'bg-black/5 border-black/10' : 'bg-[#0B1120] border-white/5'}`}>
              <button ref={expBtnRef} onClick={() => setActiveFilter('EXP')} className={`type-filter-btn relative z-10 flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-colors duration-300 cursor-pointer ${activeFilter === 'EXP' ? 'text-white' : isLight ? 'text-gray-500 hover:text-black' : 'text-gray-500 hover:text-white'}`}>
                {activeFilter === 'EXP' && (
                  <motion.div layoutId="pill-bg-approver" className="absolute inset-0 z-[-1] rounded-xl bg-[#CC5500] shadow-[0_0_15px_rgba(204,85,0,0.4)]" transition={{ type: "spring", bounce: 0.25, duration: 0.5 }} />
                )}
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                EXP <span className={`badge ml-1 px-2 py-0.5 rounded-md text-[10px] transition-colors duration-300 ${activeFilter === 'EXP' ? 'bg-black/20 text-white' : expCount > 0 ? (isLight ? 'bg-orange-500/10 text-orange-600 font-bold ring-1 ring-orange-500/30' : 'bg-orange-500/30 text-orange-300 font-bold ring-1 ring-orange-500/50 shadow-[0_0_8px_rgba(204,85,0,0.3)]') : (isLight ? 'bg-black/10 text-gray-500' : 'bg-white/5 text-gray-400')}`}>{expCount}</span>
              </button>
              <button ref={cabBtnRef} onClick={() => setActiveFilter('CAB')} className={`type-filter-btn relative z-10 flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-colors duration-300 cursor-pointer ${activeFilter === 'CAB' ? 'text-white' : isLight ? 'text-gray-500 hover:text-black' : 'text-gray-500 hover:text-white'}`}>
                {activeFilter === 'CAB' && (
                  <motion.div layoutId="pill-bg-approver" className="absolute inset-0 z-[-1] rounded-xl bg-[#007AFF] shadow-[0_0_15px_rgba(0,122,255,0.4)]" transition={{ type: "spring", bounce: 0.25, duration: 0.5 }} />
                )}
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg>
                CAB <span className={`badge ml-1 px-2 py-0.5 rounded-md text-[10px] transition-colors duration-300 ${activeFilter === 'CAB' ? 'bg-black/20 text-white' : cabCount > 0 ? (isLight ? 'bg-blue-500/10 text-blue-600 font-bold ring-1 ring-blue-500/30' : 'bg-blue-500/30 text-blue-300 font-bold ring-1 ring-blue-500/50 shadow-[0_0_8px_rgba(0,122,255,0.3)]') : (isLight ? 'bg-black/10 text-gray-500' : 'bg-white/5 text-gray-400')}`}>{cabCount}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Report Download Row — Only visible to CTO / Step 3 */}
        {session.stepOrder === 3 && (
        <div className="flex items-center justify-end mb-4 shrink-0">
          <button
            onClick={async () => {
              setDownloadingReport(true);
              try {
                const res = await dashboard.getCombinedReport();
                if (res.success && res.data) {
                  const fmtDate = (d: string | null | undefined) => {
                    if (!d) return '';
                    try {
                      const dt = new Date(d);
                      if (isNaN(dt.getTime())) return '';
                      const dd = String(dt.getDate()).padStart(2, '0');
                      const mm = String(dt.getMonth() + 1).padStart(2, '0');
                      const yyyy = dt.getFullYear();
                      const hh = String(dt.getHours()).padStart(2, '0');
                      const min = String(dt.getMinutes()).padStart(2, '0');
                      return `${dd}-${mm}-${yyyy} ${hh}:${min}`;
                    } catch { return ''; }
                  };
                  const esc = (v: any) => `"${String(v ?? '').replace(/"/g, '""')}"`;
                  const reqType = (t: number | undefined) => t === 1 ? 'Database' : t === 2 ? 'Application' : t === 3 ? 'Both' : String(t ?? '');
                  const statusLabel = (r: any) => {
                    if (r.isRevert) return 'REVERT RELEASED';
                    const s = r.status;
                    if (s === 0) return 'RETURNED';
                    if (s === 1) return 'PENDING';
                    if (s === 2) return 'RECOMMENDED';
                    if (s === 3) return 'VERIFIED';
                    if (s === 4) return 'APPROVED';
                    if (s === 5) return 'RELEASED';
                    return `Status ${s}`;
                  };

                  const headers = [
                    'CRF ID', 'Ticket ID', 'Source', 'REQ ID', 'User ID',
                    'Subject', 'Description', 'Requirement Type',
                    'Commit ID', 'Publish Path', 'Reason For Expedite',
                    'Recommender', 'Recommended Date',
                    'Verified By', 'Verified Date',
                    'Approved By', 'Approved Date',
                    'Released By', 'Released Date',
                    'Revert Recommender', 'Revert Recommender Date',
                    'Revert Verified', 'Revert Verified Date',
                    'Revert Approved', 'Revert Approved Date',
                    'Status'
                  ];
                  const csvRows = [headers.join(',')];
                  for (const r of res.data) {
                    csvRows.push([
                      r.crfId ?? '',
                      r.ticketId ?? '',
                      r.source ?? '',
                      esc(r.req_id),
                      r.userId ?? '',
                      esc(r.subject),
                      esc(r.description),
                      reqType(r.requirementType),
                      esc(r.commitId),
                      esc(r.publishPath),
                      esc(r.reasonForExpedite),
                      r.recommender ?? '',
                      fmtDate(r.recommenderDate),
                      r.verified ?? '',
                      fmtDate(r.verifiedDate),
                      r.approved ?? '',
                      fmtDate(r.approvedDate),
                      r.releasedBy ?? '',
                      fmtDate(r.releasedDate),
                      r.revertRecommender ?? '',
                      fmtDate(r.revertRecommenderDate),
                      r.revertVerified ?? '',
                      fmtDate(r.revertVerifiedDate),
                      r.revertApproved ?? '',
                      fmtDate(r.revertApprovedDate),
                      statusLabel(r)
                    ].join(','));
                  }
                  const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `release_report_${new Date().toISOString().slice(0,10)}.csv`;
                  a.click();
                  URL.revokeObjectURL(url);
                }
              } catch (e) { console.error(e); }
              setDownloadingReport(false);
            }}
            disabled={downloadingReport}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500/20 text-emerald-400 text-xs font-bold border border-emerald-500/30 hover:bg-emerald-500/30 transition-all cursor-pointer disabled:opacity-50 whitespace-nowrap"
            title="Download Combined Release Report"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
            {downloadingReport ? 'Downloading...' : 'Report'}
          </button>
        </div>
        )}

        <div className="flex-1 overflow-auto pr-2">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-64">
              <div className="w-48 h-48 relative mb-2">
                <DotLottiePlayer src={`${import.meta.env.BASE_URL}loading.lottie`} autoplay loop />
              </div>
              <p className="text-[#0084FF] font-mono text-[10px] uppercase tracking-widest animate-pulse font-bold mt-[-10px]">Syncing action required...</p>
            </div>
          ) : filteredQueue.length === 0 ? (
            <div className="flex items-center justify-center h-32">
              <p className="text-gray-500 font-mono text-sm">No pending items</p>
            </div>
          ) : (
            <table className="release-table w-full">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Project</th>
                  <th>Requester</th>
                  <th>Release Type</th>
                  <th>QA Status</th>
                  <th className="text-center w-32">Actions</th>
                </tr>
              </thead>
              <tbody>
                <AnimatePresence mode="popLayout">
                  {filteredQueue.map((req, i) => {
                    const displayId = ((req as any)._releaseType === 'CAB_TICKET' || (req as any)._releaseType === 'EXP_TICKET') ? (req.ticketId || req.crfId) : (req.crfId || req.ticketId);
                    return (
                      <motion.tr 
                        layout
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.3, delay: i * 0.1 }}
                        key={`${(req as any)._releaseType}-${displayId}`} 
                        data-type={activeFilter}
                      >
                        <td>
                          {req.reqId ? (
                            <>
                              <div className="font-mono text-sm text-orange-500 font-bold">{req.reqId}</div>
                              <div className="text-[10px] text-gray-500 font-mono mt-1 tracking-tight">#{displayId}</div>
                            </>
                          ) : (
                            <div className="font-mono text-sm text-amber-500 font-bold">{displayId}</div>
                          )}
                        </td>
                        <td>
                          <div className="text-sm text-[color:var(--text-heading)]">{req.projectName || req.subject}</div>
                          <div className="text-xs text-[color:var(--text-muted)]">{req.crfStatus}</div>
                        </td>
                        <td>
                          <div className="text-sm font-medium text-white">{req.userName || 'N/A'}</div>
                          <div className="text-xs text-amber-500 mt-1 font-mono">{req.userId || 'N/A'}</div>
                        </td>
                        <td>
                          {(() => {
                            if ((req as any)._isRevert) {
                              return (
                                <div className="flex flex-col gap-1.5">
                                  <span className="px-2.5 py-1 rounded text-xs font-bold uppercase tracking-wider flex items-center gap-1 w-max bg-red-500/20 text-red-400 border border-red-500/30">
                                    <span className="w-1.5 h-1.5 rounded-full animate-pulse bg-red-500"></span>
                                    REVERT
                                  </span>
                                  <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-widest w-max ${isLight ? 'bg-black/5 text-gray-600' : 'bg-white/5 text-gray-400'}`}>
                                    {getRequirementTypeName(req.requirementType)}
                                  </span>
                                </div>
                              );
                            }
                            const rt = (req as any)._releaseType;
                            const isCab = rt === 'CAB_CRF' || rt === 'CAB_TICKET';
                            const isTicket = rt === 'CAB_TICKET' || rt === 'EXP_TICKET';
                            const text = isTicket ? 'TICKET' : 'CRF';
                            const colorClass = isCab
                              ? 'bg-[#0084FF]/20 text-[#0084FF] border-[#0084FF]/30'
                              : 'bg-orange-500/20 text-orange-500 border-orange-500/30';
                            const dotColor = isCab ? 'bg-[#0084FF]' : 'bg-orange-500';

                            return (
                              <div className="flex flex-col gap-1.5">
                                <span className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 w-max border ${colorClass}`}>
                                  <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${dotColor}`}></span>
                                  {text}
                                </span>
                                <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-widest w-max ${isLight ? 'bg-black/5 text-gray-600' : 'bg-white/5 text-gray-400'}`}>
                                  {getRequirementTypeName(req.requirementType)}
                                </span>
                              </div>
                            );
                          })()}
                        </td>
                        <td>
                          <div className="text-xs font-mono text-emerald-400">{req.qaStatus || "NO QA"}</div>
                        </td>
                        <td>
                          <div className="flex items-center justify-center gap-2">
                            <Link
                              to={`/Release/ApproverDetails?crfId=${displayId}`}
                              state={{ request: req, stepOrder: session.stepOrder, isRevert: !!(req as any)._isRevert, releaseType: (req as any)._releaseType || 'EXP_CRF' }}
                              className="px-6 py-2 rounded-lg text-xs font-bold btn-details uppercase tracking-wider transition-all"
                            >
                              View Details
                            </Link>
                          </div>
                        </td>
                      </motion.tr>
                    );
                  })}
                </AnimatePresence>
              </tbody>
            </table>
          )}
        </div>
      </div>

    </div>
  );
}
