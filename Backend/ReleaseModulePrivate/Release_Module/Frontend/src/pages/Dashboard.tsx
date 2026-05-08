import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';

import { DotLottiePlayer } from '@dotlottie/react-player';
import confetti from 'canvas-confetti';
import { dashboard, auth, workflow, deriveStatus, parseDateString, flattenFlowItem } from '../services/api';
import type { FlowTrackingItem } from '../services/api';
import '../assets/css/pages/dashboard.css';

export default function Dashboard() {
  const [trackers, setTrackers] = useState<(FlowTrackingItem & { _type?: string })[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [revertModal, setRevertModal] = useState<{ crfId: number; reqId: string; _type: string } | null>(null);
  const [revertComment, setRevertComment] = useState("");
  const [revertProcessing, setRevertProcessing] = useState(false);
  const [revertResult, setRevertResult] = useState("");
  const [refreshingId, setRefreshingId] = useState<number | null>(null);
  const [celebration, setCelebration] = useState<{ crfId: number; subject: string; _type: string }[]>([]);
  const [showCelebration, setShowCelebration] = useState(false);
  const session = auth.getSession();
  const [isLight, setIsLight] = useState(() => document.documentElement.classList.contains('light'));

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsLight(document.documentElement.classList.contains('light'));
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  const fireCelebration = useCallback(() => {
    const duration = 3000;
    const end = Date.now() + duration;
    const colors = ['#10B981', '#0084FF', '#F59E0B', '#8B5CF6', '#EC4899'];

    (function frame() {
      confetti({
        particleCount: 5,
        angle: 60,
        spread: 55,
        origin: { x: 0, y: 0.7 },
        colors,
        zIndex: 9999,
      });
      confetti({
        particleCount: 5,
        angle: 120,
        spread: 55,
        origin: { x: 1, y: 0.7 },
        colors,
        zIndex: 9999,
      });
      if (Date.now() < end) requestAnimationFrame(frame);
    })();
  }, []);

  useEffect(() => {
    loadData(true);
    // Check for new releases across all request types
    if (session.empCode) {
      Promise.all([
        dashboard.getNewReleases(session.empCode),
        dashboard.getCabNewReleases(session.empCode),
        dashboard.getTicketNewReleases(session.empCode),
      ]).then(([expRes, cabRes, ticketRes]) => {
        let allCelebrations: { crfId: number; subject: string; _type: string }[] = [];

        if (expRes.success && expRes.data && Array.isArray(expRes.data)) {
          allCelebrations = [...allCelebrations, ...expRes.data.map(d => ({ ...d, _type: 'EXP_CRF' }))];
        }
        if (cabRes.success && cabRes.data && Array.isArray(cabRes.data)) {
          allCelebrations = [...allCelebrations, ...cabRes.data.map(d => ({ ...d, _type: 'CAB_CRF' }))];
        }
        if (ticketRes.success && ticketRes.data && Array.isArray(ticketRes.data)) {
          allCelebrations = [...allCelebrations, ...(ticketRes.data as any[]).map(d => ({ crfId: d.ticketId, subject: d.subject, _type: 'TICKET' }))];
        }

        if (allCelebrations.length > 0) {
          setCelebration(allCelebrations);
          setShowCelebration(true);
          setTimeout(() => fireCelebration(), 300);
        }
      });
    }
  }, []);


  async function loadData(showGlobalLoad = false) {
    if (!session.empCode) return;
    if (showGlobalLoad) setLoading(true);
    const emp = parseInt(session.empCode);

    try {
      const [expRes, cabCrfRes, cabTicketRes, summaryRes] = await Promise.all([
        dashboard.getFlowDetails(emp),
        dashboard.getCabFlowDetails(emp),
        dashboard.getCabTicketFlowDetails(emp),
        dashboard.getReleaseSummary(emp)
      ]);

      if (summaryRes.success && summaryRes.data) {
        setSummary(summaryRes.data);
      }

      let allItems: (FlowTrackingItem & { _type?: string })[] = [];

      if (expRes.success && expRes.data) {
        allItems = [...allItems, ...expRes.data.map(d => ({ ...flattenFlowItem(d), _type: 'EXP' }))];
      }
      if (cabCrfRes.success && cabCrfRes.data) {
        allItems = [...allItems, ...cabCrfRes.data.map(d => ({ ...flattenFlowItem(d), _type: 'CAB' }))];
      }
      if (cabTicketRes.success && cabTicketRes.data) {
        allItems = [...allItems, ...cabTicketRes.data.map((d: any) => ({ ...flattenFlowItem(d), _type: d.cabExp === 'EXP' ? 'EXP_TICKET' : 'CAB_TICKET' }))];
      }

      const now = Date.now();
      const filtered = allItems.filter(t => {
        const status = deriveStatus(t);
        // Do not show dismissed requests
        if (status === -1) return false;

        // If status is 0 (Returned) and it has a returnDate, hide it if strictly > 24 hours
        if (status === 0 && t.returnDate) {
          const parsed = parseDateString(t.returnDate);
          if (!parsed) return true; // If date can't be parsed, show the item
          const diffInMs = now - parsed.getTime();
          const diffInHours = diffInMs / (1000 * 60 * 60);
          return diffInHours <= 24;
        }

        // If status is 5 (Released) and it has a releasedDate, hide it if strictly > 48 hours
        if (status === 5 && t.releasedDate && t.releasedBy !== "N/A") {
          const parsed = parseDateString(t.releasedDate);
          if (!parsed) return true; // If date can't be parsed, show the item
          const diffInMs = now - parsed.getTime();
          const diffInHours = diffInMs / (1000 * 60 * 60);
          return diffInHours <= 48;
        }
        return true;
      });

      // Sort with newest submitted ID at the top by default since they're merged
      filtered.sort((a, b) => b.crfId - a.crfId);

      setTrackers(filtered);
    } catch {
      // Data load failed — UI shows empty state
    } finally {
      if (showGlobalLoad) setLoading(false);
    }
  }

  async function handleRefresh(crfId: number) {
    setRefreshingId(crfId);
    await loadData(false);
    setRefreshingId(null);
  }

  function getProgress(t: FlowTrackingItem) {
    const s = deriveStatus(t);
    if (s === 0) return { done: 0, pct: 0, rejected: true };
    // For Released step: rely ONLY on status >= 5 (not name/date which could be partial)
    if (s >= 5) return { done: 4, pct: 100 };
    if (s >= 4 || (t.approver2Date && t.approver2By !== "N/A")) return { done: 3, pct: 75 };
    if (s >= 3 || (t.approver1Date && t.approver1By !== "N/A")) return { done: 2, pct: 50 };
    if (s >= 2 || (t.recommendedDate && t.recommendedBy !== "N/A")) return { done: 1, pct: 25 };
    return { done: 0, pct: 0 };
  }

  type StepInfo = { label: string; name: string; date: string | null; done: boolean };

  // Format date string to dd/mm/yyyy (strip time)
  function fmtDate(d: string | null | undefined): string | null {
    if (!d || d === 'N/A') return null;
    return d.split(' ')[0].replace(/-/g, '/');
  }

  function getSteps(t: FlowTrackingItem): StepInfo[] {
    const s = deriveStatus(t);
    return [
      { label: "REQUESTED", name: session.empName, date: fmtDate(t.requestedDate) || fmtDate(t.createdDate), done: true },
      { label: "RECOMMENDED", name: t.recommendedBy !== "N/A" ? t.recommendedBy : (s >= 2 ? "System" : "--"), date: fmtDate(t.recommendedDate), done: s >= 2 || (t.recommendedBy !== "N/A" && !!t.recommendedDate) },
      { label: "VERIFIED", name: t.approver1By !== "N/A" ? t.approver1By : (s >= 3 ? "System" : "--"), date: fmtDate(t.approver1Date), done: s >= 3 || (t.approver1By !== "N/A" && !!t.approver1Date) },
      { label: "APPROVED", name: t.approver2By !== "N/A" ? t.approver2By : (s >= 4 ? "System" : "--"), date: fmtDate(t.approver2Date), done: s >= 4 || (t.approver2By !== "N/A" && !!t.approver2Date) },
      { label: "RELEASED", name: t.releasedBy !== "N/A" ? t.releasedBy : (s >= 5 ? "System" : "--"), date: fmtDate(t.releasedDate), done: s >= 5 },
    ];
  }

  function getStatusLabel(status: number): string {
    const labels: Record<number, string> = {
      0: "Returned", 1: "Pending", 2: "Recommended", 3: "Verified",
      4: "Approved", 5: "Released", 6: "Revert Requested", 7: "Revert Recommended",
      8: "Revert Verified", 9: "Revert Approved", 10: "Revert Released",
    };
    return labels[status] || `Status ${status}`;
  }

  function getRevertProgress(t: FlowTrackingItem) {
    const s = deriveStatus(t);
    if (s >= 10) return { pct: 100 };
    if (s >= 9) return { pct: 75 };
    if (s >= 8) return { pct: 50 };
    if (s >= 7) return { pct: 25 };
    return { pct: 0 };
  }

  function getRevertSteps(t: FlowTrackingItem): StepInfo[] {
    const s = deriveStatus(t);
    return [
      { label: "REVERT REQUESTED", name: session.empName, date: t.revertDate ?? null, done: s >= 6 },
      { label: "REVERT RECOMMENDED", name: t.revertRecommendedBy && t.revertRecommendedBy !== "N/A" ? t.revertRecommendedBy : (s >= 7 ? "System" : "--"), date: t.revertRecommendedDate ?? null, done: s >= 7 },
      { label: "REVERT VERIFIED", name: t.revertApprover1By && t.revertApprover1By !== "N/A" ? t.revertApprover1By : (s >= 8 ? "System" : "--"), date: t.revertApprover1Date ?? null, done: s >= 8 },
      { label: "REVERT APPROVED", name: t.revertApprover2By && t.revertApprover2By !== "N/A" ? t.revertApprover2By : (s >= 9 ? "System" : "--"), date: t.revertApprover2Date ?? null, done: s >= 9 },
      { label: "REVERT RELEASED", name: s >= 10 ? "Release Team" : "--", date: null, done: s >= 10 },
    ];
  }

  async function handleSubmitRevert() {
    if (!revertModal) return;
    setRevertProcessing(true);
    setRevertResult("");

    const id = revertModal.crfId;
    const userId = parseInt(session.empCode);
    const type = revertModal._type;
    const reqIdStr = revertModal.reqId;

    let res;
    if (type === 'EXP') {
      // EXP CRF → CrfCabExpRevert/SubmitRevert (VerifyDto: crfId)
      res = await workflow.submitExpCrfRevert(id, reqIdStr, userId, revertComment);
    } else if (type === 'EXP_TICKET') {
      // EXP Ticket → ExpRequest/SubmitRevert (TicketVerifyDto: ticketId)
      res = await workflow.submitRevert(id, reqIdStr, userId, revertComment);
    } else if (type === 'CAB') {
      // CAB CRF → CrfCabExpRevert/CabRevert (VerifyDto: crfId)
      res = await workflow.submitCabCrfRevert(id, reqIdStr, userId, revertComment);
    } else if (type === 'CAB_TICKET') {
      // CAB Ticket → CabTicketRequest/SubmitRevert (TicketVerifyDto: ticketId)
      res = await workflow.submitCabTicketRevert(id, reqIdStr, userId, revertComment);
    } else {
      // Fallback to EXP CRF
      res = await workflow.submitExpCrfRevert(id, reqIdStr, userId, revertComment);
    }

    setRevertProcessing(false);
    if (res.success) {
      setRevertResult("Revert request submitted successfully!");
      setRevertComment("");
      setTimeout(() => {
        setRevertModal(null);
        setRevertResult("");
        loadData(); // Refresh to show updated status
      }, 1500);
    } else {
      setRevertResult(res.message || "Failed to submit revert request");
    }
  }

  return (
    <>
      {/* Welcome Banner / Quick Stats */}
      <div className="sticky top-2 z-40 mt-2 grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {/* Total Released */}
        <div className="glass-panel p-5 rounded-2xl neon-hover-blue transition-all duration-300 group cursor-default">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] text-gray-400 uppercase tracking-widest font-mono mb-1">Total Released</p>
              <h2 className="text-3xl font-light text-emerald-400 text-shadow-emerald">
                {summary?.overall?.totalReleased ?? '—'}
              </h2>
            </div>
            <div className="p-2.5 glass-panel rounded-xl group-hover:bg-emerald-500/20 transition-colors text-emerald-400">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
            </div>
          </div>
        </div>

        {/* Revert Released */}
        <div className="glass-panel p-5 rounded-2xl neon-hover-blue transition-all duration-300 group cursor-default">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] text-gray-400 uppercase tracking-widest font-mono mb-1">Revert Released</p>
              <h2 className="text-3xl font-light text-amber-400">
                {summary?.overall?.totalRevertReleased ?? '—'}
              </h2>
            </div>
            <div className="p-2.5 glass-panel rounded-xl group-hover:bg-amber-500/20 transition-colors text-amber-400">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
              </svg>
            </div>
          </div>
        </div>

        {/* Returned */}
        <div className="glass-panel p-5 rounded-2xl neon-hover-blue transition-all duration-300 group cursor-default">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] text-gray-400 uppercase tracking-widest font-mono mb-1">Returned</p>
              <h2 className="text-3xl font-light text-red-400">
                {summary?.overall?.totalReturned ?? '—'}
              </h2>
            </div>
            <div className="p-2.5 glass-panel rounded-xl group-hover:bg-red-500/20 transition-colors text-red-400">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Release Tracking */}
      <div id="trackers-container" className="flex flex-col gap-6 w-full mb-8">
        {loading && (
          <div className="glass-panel rounded-2xl p-12 flex flex-col items-center justify-center">
            <div className="w-48 h-48 mb-2">
              <DotLottiePlayer src={`${import.meta.env.BASE_URL}loading.lottie`} autoplay loop />
            </div>
            <p className="text-gray-400 font-mono text-sm animate-pulse">Loading your requests...</p>
          </div>
        )}

        {!loading && trackers.length === 0 && (
          <div className="glass-panel rounded-2xl p-12 text-center">
            <p className="text-gray-500 font-mono text-sm">No active requests found</p>
          </div>
        )}

        {trackers.map((t) => {
          const progress = getProgress(t);
          const steps = getSteps(t);
          const status = deriveStatus(t);
          const isRejected = status === 0;
          const isReleased = status === 5;
          const isRevertInProgress = status >= 6 && status <= 10;

          return (
            <div key={t.crfId} className={`glass-panel rounded-2xl flex flex-col p-6 relative overflow-hidden group ${isRejected ? 'border-red-500/30 border' : 'border-white/10'}`}>
              {refreshingId === t.crfId && (
                <div className={`absolute inset-0 z-50 flex flex-col items-center justify-center backdrop-blur-md rounded-2xl border ${isLight ? 'bg-white/80 border-slate-200' : 'bg-[#0B1120]/80 border-white/10'}`}>
                  <div className={`w-40 h-40 relative mb-2 ${isLight ? 'opacity-80' : ''}`}>
                    <DotLottiePlayer src={`${import.meta.env.BASE_URL}loading.lottie`} autoplay loop />
                  </div>
                  <p className="text-[#0084FF] font-mono text-[10px] uppercase tracking-widest animate-pulse font-bold mt-[-10px]">Refreshing Tracker Data...</p>
                </div>
              )}
              <div className={`absolute inset-0 opacity-5 bg-[linear-gradient(rgba(255,255,255,1)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,1)_1px,transparent_1px)] bg-[length:40px_40px] pointer-events-none`}></div>
              {/* Red glow overlay for rejected items */}
              {isRejected && <div className="absolute inset-0 bg-red-500/5 pointer-events-none"></div>}
              <div className="flex items-center justify-between mb-8 z-10">
                <div>
                  <h2 className="text-xl font-light tracking-wide text-white uppercase flex items-center gap-3">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold border animate-pulse tracking-widest ${t._type === 'CAB' || t._type === 'CAB_TICKET'
                      ? 'bg-[#0084FF]/20 text-[#0084FF] border-[#0084FF]/30'
                      : 'bg-orange-500/20 text-orange-500 border-orange-500/30'
                      }`}>
                      {t._type === 'EXP_TICKET' ? 'EXP TICKET' : t._type === 'CAB_TICKET' ? 'CAB TICKET' : t._type === 'CAB' ? 'CAB' : 'EXP'}
                    </span>
                    Release Tracking
                  </h2>
                  {(t as any).reqId && (
                    <p className="text-xs text-gray-400 font-mono mt-1 tracking-widest uppercase">
                      REQ ID: <span className="text-white">{(t as any).reqId}</span>
                    </p>
                  )}
                  <p className="text-xs text-gray-400 font-mono mt-0.5 tracking-widest uppercase">
                    {t._type === 'EXP_TICKET' || t._type === 'CAB_TICKET' ? 'TICKET ID' : 'CRF ID'}: <span className="text-white">{t.crfId}</span>
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  {/* Removed Cancel Request button as per requirements */}

                  {/* Status badge for revert states */}
                  {isRevertInProgress && (
                    <span className="px-3 py-1.5 rounded-lg text-[10px] font-bold bg-red-500/20 text-red-400 border border-red-500/30 tracking-widest uppercase animate-pulse">
                      {getStatusLabel(status)}
                    </span>
                  )}

                  {/* Revert button — only for status 5 (Released) */}
                  {isReleased && (
                    <button
                      onClick={() => setRevertModal({ crfId: t.crfId, reqId: t.reqId || '', _type: t._type || 'EXP' })}
                      className="px-5 py-2.5 rounded-lg text-[10px] font-bold text-white bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 border border-red-400/50 shadow-[0_0_20px_rgba(239,68,68,0.4)] transition-all tracking-widest uppercase flex items-center gap-2 hover:shadow-[0_0_30px_rgba(239,68,68,0.6)] transform hover:-translate-y-0.5"
                    >
                      <span className="relative flex h-2 w-2 mr-1">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
                      </span>
                      REVERT RELEASE
                    </button>
                  )}

                  <button
                    onClick={() => handleRefresh(t.crfId)}
                    disabled={refreshingId === t.crfId}
                    className="glass-panel px-4 py-2 rounded-lg text-xs font-mono text-[#0084FF] hover:bg-[#0084FF]/10 border border-[#0084FF]/30 transition-colors tracking-widest uppercase flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <svg className={`w-4 h-4 ${refreshingId === t.crfId ? 'animate-spin [animation-direction:reverse]' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    {refreshingId === t.crfId ? 'Syncing...' : 'Refresh'}
                  </button>
                </div>
              </div>
              {/* ─── REJECTED: Show rejection panel instead of progress stepper ─── */}
              {isRejected ? (
                <div className="relative w-full py-4 z-10 flex-1 flex flex-col justify-center">
                  <div className={`transition-opacity duration-300 ${refreshingId === t.crfId ? 'opacity-0' : 'opacity-100'}`}>
                    {/* Rejection banner */}
                    <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-5">
                      <div className="flex items-start gap-4">
                        {/* Animated red X icon */}
                        <div className="flex-shrink-0 w-12 h-12 rounded-full bg-red-500/20 border border-red-500/40 flex items-center justify-center rejected-blink shadow-[0_0_20px_rgba(239,68,68,0.3)]">
                          <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"></path></svg>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-red-400 uppercase tracking-widest mb-2">Request Rejected</p>
                          <div className="flex items-center gap-3 mb-3">
                            <span className="text-[10px] text-gray-400 uppercase tracking-wider font-mono">Rejected By:</span>
                            <span className="text-sm font-semibold text-white">{t.returnBy && t.returnBy !== 'N/A' ? t.returnBy : 'Unknown'}</span>
                            {t.returnDate && (
                              <span className="text-[10px] text-gray-500 font-mono">on {t.returnDate}</span>
                            )}
                          </div>
                          {t.returnComment && (
                            <div className={`rounded-lg p-3 border ${isLight ? 'bg-black/5 border-black/10' : 'bg-black/30 border-white/5'}`}>
                              <p className="text-[10px] text-gray-500 uppercase tracking-widest font-mono mb-1">Reason</p>
                              <p className={`text-sm leading-relaxed italic ${isLight ? 'text-black font-medium' : 'text-gray-300'}`}>"{t.returnComment}"</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : isRevertInProgress ? (
                /* ─── REVERT: Show revert progress stepper ─── */
                <div className="relative w-full py-6 z-10 flex-1 flex flex-col justify-center">
                  <div className={`transition-opacity duration-300 ${refreshingId === t.crfId ? 'opacity-0' : 'opacity-100'}`}>

                    {/* Revert progress stepper */}
                    <div className="relative z-10 w-full">
                      <div className="absolute top-[20px] left-[10%] right-[10%] h-1 bg-white/10 -translate-y-1/2 rounded z-0"></div>
                      <div className="absolute top-[20px] left-[10%] right-[10%] h-1 z-0 rounded pointer-events-none flex -translate-y-1/2">
                        <div className="h-full transition-all duration-700 ease-in-out bg-red-500 shadow-[0_0_15px_#ef4444]" style={{ width: `${getRevertProgress(t).pct}%` }}></div>
                      </div>
                      <div className="relative z-10 w-full flex justify-between items-start">
                        {getRevertSteps(t).map((step, i) => {
                          const revertSteps = getRevertSteps(t);
                          const isCurrent = !step.done && (i === 0 || revertSteps[i - 1].done);
                          return (
                            <div key={step.label} className="flex flex-col items-center relative" style={{ width: '20%' }}>
                              <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-4 z-10 transition-all duration-300 ${step.done
                                ? 'bg-red-500 shadow-[0_0_20px_rgba(239,68,68,0.6)]'
                                : isCurrent
                                  ? 'bg-gray-900 border-2 border-red-500 shadow-[0_0_20px_rgba(239,68,68,0.5)] animate-pulse'
                                  : 'bg-gray-900 border border-white/10'
                                }`}>
                                {step.done ? (
                                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
                                ) : isCurrent ? (
                                  <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                                ) : (
                                  <span className="text-sm font-mono text-gray-500">{i + 1}</span>
                                )}
                              </div>
                              <div className="text-center">
                                <h3 className={`text-[9px] sm:text-[10px] uppercase tracking-wider mb-1 px-1 font-semibold ${step.done || isCurrent ? 'text-red-400' : 'text-gray-500'}`}>{step.label}</h3>
                                <p className="text-[9px] font-mono text-gray-400 mt-1">{step.done ? step.name : isCurrent ? 'IN PROGRESS' : '--'}</p>
                                <p className="text-[9px] font-mono text-gray-400/60">{step.date || '--'}</p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                /* ─── Normal progress stepper ─── */
                <div className="relative w-full py-6 z-10 flex-1 flex flex-col justify-center">
                  <div className={`relative z-10 w-full transition-opacity duration-300 ${refreshingId === t.crfId ? 'opacity-0' : 'opacity-100'}`}>
                    <div className="absolute top-[20px] left-[10%] right-[10%] h-1 bg-white/10 -translate-y-1/2 rounded z-0"></div>
                    <div className="absolute top-[20px] left-[10%] right-[10%] h-1 z-0 rounded pointer-events-none flex -translate-y-1/2">
                      <div className={`h-full transition-all duration-700 ease-in-out ${t._type === 'CAB' || t._type === 'CAB_TICKET' ? 'bg-[#0084FF] shadow-[0_0_15px_#0084FF]' : 'bg-orange-500 shadow-[0_0_15px_#f97316]'}`} style={{ width: `${progress.pct}%` }}></div>
                    </div>
                    <div className="relative z-10 w-full flex justify-between items-start">
                      {steps.map((step, i) => {
                        const isCurrent = !step.done && (i === 0 || steps[i - 1].done);
                        return (
                          <div key={step.label} className="flex flex-col items-center relative" style={{ width: `${100 / steps.length}%` }}>
                            <div className={`step-node ${step.done ? 'completed' : isCurrent ? 'current' : 'pending'} mb-4 z-10`}>
                              {step.done ? (
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                              ) : isCurrent ? (
                                <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                              ) : (
                                <span className="text-sm font-mono">{i + 1}</span>
                              )}
                            </div>
                            <div className="text-center">
                              <h3 className={`text-[10px] sm:text-xs uppercase tracking-wider mb-1 px-1 font-semibold ${step.done || isCurrent ? 'text-[#0084FF]' : 'text-gray-500'}`}>{step.label}</h3>
                              <p className="text-[9px] font-mono text-gray-400 mt-2">{step.done ? step.name : isCurrent ? 'IN PROGRESS' : '--'}</p>
                              <p className="text-[9px] font-mono text-gray-400/60">{step.date || '--'}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {revertModal && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => { setRevertModal(null); setRevertResult(""); setRevertComment(""); }}></div>
          <div className="relative w-full max-w-lg glass-panel border border-red-500/30 rounded-2xl shadow-[0_0_60px_rgba(239,68,68,0.15)]">
            <div className="p-8">
              <div className="relative w-16 h-16 mx-auto mb-6">
                <div className="absolute inset-0 bg-red-500/30 rounded-full blur-xl animate-pulse"></div>
                <div className="relative w-full h-full rounded-full bg-black/40 flex items-center justify-center border border-red-500/30 shadow-[0_0_20px_rgba(239,68,68,0.3)] backdrop-blur-sm theme-transition">
                  <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"></path></svg>
                </div>
              </div>
              <h2 className="text-xl font-bold text-white text-center tracking-wide mb-3">Revert Release</h2>
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 mb-6 theme-transition">
                <p className="text-sm text-gray-300 text-center leading-relaxed theme-transition">
                  You are about to revert the release for {revertModal._type === 'EXP_TICKET' || revertModal._type === 'CAB_TICKET' ? 'Ticket' : 'CRF'} <span className="text-white font-mono font-bold bg-black/40 px-1.5 py-0.5 rounded theme-transition">{revertModal.crfId}</span>.<br />
                  <span className="text-red-400 mt-2 inline-block text-xs uppercase tracking-widest font-bold">This will trigger a rollback review.</span>
                </p>
              </div>

              {revertResult && (
                <div className={`mb-4 text-center text-sm font-semibold py-3 px-4 rounded-xl ${revertResult.includes('success') ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/20 text-red-400 border border-red-500/20'}`}>
                  {revertResult}
                </div>
              )}

              <div className="mb-6">
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Reason for Revert <span className="text-red-500">*</span></label>
                <textarea
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 focus:border-red-500/50 focus:outline-none resize-none h-28 transition-colors theme-transition"
                  placeholder="Describe why this release needs to be reverted..."
                  maxLength={150}
                  value={revertComment}
                  onChange={e => setRevertComment(e.target.value)}
                ></textarea>
                <div className="text-right text-[10px] text-gray-500 mt-1 font-mono">{revertComment.length}/150</div>
              </div>
              <div className="flex gap-4">
                <button onClick={() => { setRevertModal(null); setRevertResult(""); setRevertComment(""); }} className="flex-1 px-6 py-3 text-sm text-gray-400 hover:text-white border border-white/10 hover:border-white/30 rounded-xl transition-all">Cancel</button>
                <button
                  onClick={handleSubmitRevert}
                  disabled={revertProcessing || !revertComment.trim()}
                  className="flex-1 px-6 py-3 rounded-xl text-sm font-bold bg-red-500/80 hover:bg-red-500 text-white border border-red-500/50 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"></path></svg>
                  {revertProcessing ? 'Submitting...' : 'Submit Revert'}
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* 🎉 Celebration Popup */}
      {showCelebration && celebration.length > 0 && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/85 backdrop-blur-md"></div>
          <div className="relative w-full max-w-md rounded-2xl overflow-hidden border border-emerald-500/30 shadow-[0_0_80px_rgba(16,185,129,0.2)]">
            {/* Gradient background */}
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-900/90 via-slate-900/95 to-blue-900/90"></div>
            {/* Grid pattern overlay */}
            <div className="absolute inset-0 opacity-5 bg-[linear-gradient(rgba(255,255,255,1)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,1)_1px,transparent_1px)] bg-[length:30px_30px]"></div>

            <div className="relative p-10 text-center flex flex-col items-center">
              {/* Glowing icon */}
              <div className="relative mb-6">
                <div className="absolute inset-0 bg-emerald-500/40 rounded-full blur-2xl animate-pulse w-24 h-24 -translate-x-2 -translate-y-2"></div>
                <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-[0_0_40px_rgba(16,185,129,0.5)]">
                  <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                  </svg>
                </div>
              </div>

              {/* Title */}
              <h2 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-emerald-300 via-white to-blue-300 mb-2 tracking-wide">
                🎉 Released!
              </h2>
              <p className="text-emerald-100/70 text-sm mb-6">Your request{celebration.length > 1 ? 's have' : ' has'} been deployed to production!</p>

              {/* Released items list */}
              <div className="w-full space-y-2 mb-8">
                {celebration.map(item => (
                  <div key={`${item._type}-${item.crfId}`} className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/5 border border-white/10">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.8)] animate-pulse"></span>
                    <span className="text-white font-mono text-sm font-bold">{item._type === 'TICKET' ? 'TKT' : 'CRF'}-{item.crfId}</span>
                    <span className="text-gray-400 text-xs truncate flex-1 text-left">{item.subject}</span>
                    <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 uppercase tracking-widest">LIVE</span>
                  </div>
                ))}
              </div>

              {/* Dismiss button */}
              <button
                onClick={async () => {
                  setShowCelebration(false);
                  // Mark seen per type
                  const expIds = celebration.filter(c => c._type === 'EXP_CRF').map(c => c.crfId);
                  const cabIds = celebration.filter(c => c._type === 'CAB_CRF').map(c => c.crfId);
                  const ticketIds = celebration.filter(c => c._type === 'TICKET').map(c => c.crfId);
                  if (expIds.length > 0) await dashboard.markCelebrationSeen(expIds);
                  if (cabIds.length > 0) await dashboard.markCabCelebrationSeen(cabIds);
                  if (ticketIds.length > 0) await dashboard.markTicketCelebrationSeen(ticketIds);
                  setCelebration([]);
                }}
                className="px-10 py-3.5 rounded-xl text-sm font-bold bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white shadow-[0_0_25px_rgba(16,185,129,0.4)] transition-all duration-300 transform hover:-translate-y-0.5 hover:shadow-[0_0_35px_rgba(16,185,129,0.6)] tracking-wider uppercase"
              >
                Done!
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
