import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { DotLottiePlayer } from "@dotlottie/react-player";
import { dashboard, auth, workflow, cabWorkflow, getRequirementTypeName } from "../../services/api";
import type { PendingRequestItem } from "../../services/api";
import HeaderSearch from "../../components/HeaderSearch";
import Signature from "../../components/Signature";
import '../../assets/css/pages/release-dashboard.css';

export default function ReleaseDashboard() {
  const navigate = useNavigate();
  const [activeFilter, setActiveFilter] = useState<"EXP" | "CAB">("EXP");
  const [locking, setLocking] = useState<number | null>(null);
  const [isLight, setIsLight] = useState(() => document.documentElement.classList.contains('light'));
  const [expQueue, setExpQueue] = useState<(PendingRequestItem & { _isRevert?: boolean; _releaseType?: string })[]>([]);
  const [cabQueue, setCabQueue] = useState<(PendingRequestItem & { _isRevert?: boolean; _releaseType?: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [clickCount, setClickCount] = useState(0);
  const [isSignatureActive, setIsSignatureActive] = useState(false);
  const expBtnRef = useRef<HTMLButtonElement>(null);
  const cabBtnRef = useRef<HTMLButtonElement>(null);

  // Handle signature easter egg 7-click trigger
  useEffect(() => {
    if (clickCount > 0 && clickCount < 7) {
      const timer = setTimeout(() => setClickCount(0), 400); // 400ms reset
      return () => clearTimeout(timer);
    } else if (clickCount >= 7) {
      setIsSignatureActive(true);
      setClickCount(0);
    }
  }, [clickCount]);

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

  // Helper: check if a release field value means "actually released"
  // Backend may return "N/A" string instead of null for unset fields
  const hasReleased = (val?: string | null) => !!val && val !== 'N/A';

  const filterByRole = (items: typeof expQueue) => {
    const role = session.roleStatus?.toUpperCase() || '';
    return items.filter(item => {
      const reqType = Number(item.requirementType);
      if (role === 'DB_RELEASE') return reqType === 1 || reqType === 3;
      if (role === 'APPLICATION_RELEASE' || role === 'APP_RELEASE') return reqType === 2 || reqType === 3;
      // If role doesn't match known release roles, show all (fallback)
      return true;
    }).map(item => {
      // Mark lock visibility from backend fields
      const role = session.roleStatus?.toUpperCase() || '';
      const myCode = session.empCode;
      const isDual = Number(item.requirementType) === 3;
      const isRevert = !!(item as any)._isRevert;
      let lockedByOther = false;

      // Pick the correct assignment fields based on revert status
      const dbAssigned = isRevert ? item.revertDbAssignedTo : item.dbAssignedTo;
      const appAssigned = isRevert ? item.revertAppAssignedTo : item.appAssignedTo;

      // Detect if another person of MY SAME role locked it
      if (role === 'DB_RELEASE' && dbAssigned && dbAssigned !== myCode) {
        lockedByOther = true;
      }
      if ((role === 'APPLICATION_RELEASE' || role === 'APP_RELEASE') && appAssigned && appAssigned !== myCode) {
        lockedByOther = true;
      }

      // If locked by me (from backend), mark as my in-progress
      let isMyLock = (role === 'DB_RELEASE' && dbAssigned === myCode) ||
        ((role === 'APPLICATION_RELEASE' || role === 'APP_RELEASE') && appAssigned === myCode);

      // For DUAL items: if MY side has already been released, override lock state
      // (Backend doesn't clear assignedTo for DUAL after partial release, so isMyLock stays true)
      if (isDual && isMyLock) {
        const mySideReleased = isRevert
          ? (role === 'DB_RELEASE' ? hasReleased(item.revertDbReleasedBy) : hasReleased(item.revertAppReleasedBy))
          : (role === 'DB_RELEASE' ? hasReleased(item.dbReleasedBy) : hasReleased(item.appReleasedBy));
        if (mySideReleased) {
          isMyLock = false;
        }
      }

      const isUpcoming = !!(item as any)._isUpcoming;

      // Pick the relevant assigned-to fields based on the viewer's role
      const myAssignedTo = role === 'DB_RELEASE' ? dbAssigned : appAssigned;
      const myAssignedName = role === 'DB_RELEASE'
        ? ((item as any).dbAssignedName && (item as any).dbAssignedName !== 'N/A' ? (item as any).dbAssignedName : dbAssigned)
        : ((item as any).appAssignedName && (item as any).appAssignedName !== 'N/A' ? (item as any).appAssignedName : appAssigned);

      return {
        ...item,
        assignedTo: isUpcoming ? undefined : (lockedByOther ? myAssignedTo : item.assignedTo),
        assignedToName: isUpcoming ? undefined : (lockedByOther ? myAssignedName : undefined),
        isMyInProgress: isUpcoming ? false : (isMyLock || item.isMyInProgress),
        _lockedByOther: isUpcoming ? false : lockedByOther,
      };
    });
  };

  // Fetch approved items ready for release + revert-release items + upcoming pipeline items
  const loadQueue = async (showLoading = false) => {
    if (!session.empCode) return;
    if (showLoading) setLoading(true);

    const emp = session.empCode;

    // Fire ALL requests in parallel
    const [resExp, revertResExp, resExpTicket, revertResExpTicket, resCabCrf, resCabTicket, revertResCab, revertResCabTicket,
      updAll] = await Promise.all([
        dashboard.getReleased(emp),
        dashboard.getRevertRelease(emp),
        dashboard.getExpTicketReleased(emp),
        dashboard.getExpTicketRevertRelease(emp),
        dashboard.getCabCrfReleased(emp),
        dashboard.getCabTicketReleased(emp),
        dashboard.getCabRevertRelease(emp),
        dashboard.getCabTicketRevertRelease(emp),
        // Upcoming — try unified endpoint first
        dashboard.getUpcomingReleased(),
      ]);

    const extract = (r: any) => (r.success && r.data && Array.isArray(r.data)) ? r.data : [];

    // Helper to get step label from status
    const stepLabel = (s: any) => {
      const sNum = Number(s);
      if (sNum === 1) return 'Recommendation';
      if (sNum === 2) return 'Verification';
      if (sNum === 3) return 'Approval';
      if (sNum === 6) return 'Revert Recommendation';
      if (sNum === 7) return 'Revert Verification';
      if (sNum === 8) return 'Revert Approval';
      return 'Approval';
    };

    const readyExp = [
      ...extract(resExp).map((item: any) => ({ ...item, _releaseType: 'EXP_CRF' as const })),
      ...extract(revertResExp).map((item: any) => ({ ...item, _isRevert: true as const, _releaseType: 'EXP_CRF' as const })),
      ...extract(resExpTicket).map((item: any) => ({ ...item, _releaseType: 'EXP_TICKET' as const })),
      ...extract(revertResExpTicket).map((item: any) => ({ ...item, _isRevert: true as const, _releaseType: 'EXP_TICKET' as const })),
    ];

    // --- Upcoming pipeline items ---
    let upcomingData = extract(updAll);

    // If unified endpoint returned nothing, try the 4 separate endpoints as fallback
    if (upcomingData.length === 0) {
      const [upExpCrf, upCabCrf, upExpTicket, upCabTicket] = await Promise.all([
        dashboard.getUpcomingExpCrf(emp),
        dashboard.getUpcomingCabCrf(emp),
        dashboard.getUpcomingExpTicket(emp),
        dashboard.getUpcomingCabTicket(emp),
      ]);
      // Tag each result with its source so we know which queue it belongs to
      upcomingData = [
        ...extract(upExpCrf).map((item: any) => ({ ...item, _srcTag: 'EXP_CRF' })),
        ...extract(upCabCrf).map((item: any) => ({ ...item, _srcTag: 'CAB_CRF' })),
        ...extract(upExpTicket).map((item: any) => ({ ...item, _srcTag: 'EXP_TICKET' })),
        ...extract(upCabTicket).map((item: any) => ({ ...item, _srcTag: 'CAB_TICKET' })),
      ];
    }

    // Classify each upcoming item as EXP or CAB
    // Priority: _srcTag (from per-type endpoints) > source/cabExp (from unified endpoint) > default to EXP
    const classifyUpcoming = (item: any): 'EXP' | 'CAB' => {
      // If tagged from per-type endpoint, use that
      if (item._srcTag) return item._srcTag.startsWith('CAB') ? 'CAB' : 'EXP';
      // Check source field (unified endpoint may set this)
      const src = (item.source || '').toUpperCase();
      if (src === 'CAB') return 'CAB';
      if (src === 'EXP') return 'EXP';
      // Check cabExp field
      const ce = (item.cabExp || '').toUpperCase();
      if (ce === 'CAB') return 'CAB';
      if (ce === 'EXP') return 'EXP';
      // Default: items without source/cabExp are from ExpRequests table → EXP
      return 'EXP';
    };

    const getReleaseType = (item: any): string => {
      if (item._srcTag) return item._srcTag;
      const isCab = classifyUpcoming(item) === 'CAB';
      const isTicket = !!item.ticketId;
      if (isCab) return isTicket ? 'CAB_TICKET' : 'CAB_CRF';
      return isTicket ? 'EXP_TICKET' : 'EXP_CRF';
    };

    const upcomingExp = upcomingData
      .filter((item: any) => classifyUpcoming(item) === 'EXP')
      .map((item: any) => ({
        ...item,
        _releaseType: getReleaseType(item),
        _isUpcoming: true,
        _stepLabel: stepLabel(item.status)
      }));

    const readyCab = [
      ...extract(resCabCrf).map((item: any) => ({ ...item, _releaseType: 'CAB_CRF' as const })),
      ...extract(resCabTicket).map((item: any) => ({ ...item, _releaseType: 'CAB_TICKET' as const })),
      ...extract(revertResCab).map((item: any) => ({ ...item, _isRevert: true as const, _releaseType: 'CAB_CRF' as const })),
      ...extract(revertResCabTicket).map((item: any) => ({ ...item, _isRevert: true as const, _releaseType: 'CAB_TICKET' as const })),
    ];

    const upcomingCab = upcomingData
      .filter((item: any) => classifyUpcoming(item) === 'CAB')
      .map((item: any) => ({
        ...item,
        _releaseType: getReleaseType(item),
        _isUpcoming: true,
        _stepLabel: stepLabel(item.status)
      }));

    // Deduplicate: if an item is in both ready and upcoming, keep only the ready version
    const makeKey = (item: any) => {
      const isTicket = item._releaseType === 'CAB_TICKET' || item._releaseType === 'EXP_TICKET';
      return `${item._releaseType}_${isTicket ? (item.ticketId || item.crfId) : item.crfId}`;
    };
    const readyExpKeys = new Set(readyExp.map(makeKey));
    const readyCabKeys = new Set(readyCab.map(makeKey));

    const dedupedUpcomingExp = upcomingExp.filter((item: any) => !readyExpKeys.has(makeKey(item)));
    const dedupedUpcomingCab = upcomingCab.filter((item: any) => !readyCabKeys.has(makeKey(item)));

    // Sort ready items: oldest (lowest crfId/ticketId) first
    readyExp.sort((a: any, b: any) => (a.crfId || a.ticketId || 0) - (b.crfId || b.ticketId || 0));
    dedupedUpcomingExp.sort((a: any, b: any) => (a.crfId || a.ticketId || 0) - (b.crfId || b.ticketId || 0));
    readyCab.sort((a: any, b: any) => (a.crfId || a.ticketId || 0) - (b.crfId || b.ticketId || 0));
    dedupedUpcomingCab.sort((a: any, b: any) => (a.crfId || a.ticketId || 0) - (b.crfId || b.ticketId || 0));

    // Ready items first, upcoming at the bottom
    setExpQueue(filterByRole([...readyExp, ...dedupedUpcomingExp]));
    setCabQueue(filterByRole([...readyCab, ...dedupedUpcomingCab]));

    setLoading(false);
  };

  // Use ref to prevent StrictMode double-fetch
  const hasFetched = useRef(false);
  useEffect(() => {
    if (hasFetched.current) return;
    hasFetched.current = true;
    loadQueue(true);
  }, []);

  const expCount = expQueue.filter(r => !(r as any)._isUpcoming).length;
  const cabCount = cabQueue.filter(r => !(r as any)._isUpcoming).length;
  const expUpcomingCount = expQueue.filter(r => (r as any)._isUpcoming).length;
  const cabUpcomingCount = cabQueue.filter(r => (r as any)._isUpcoming).length;
  const filteredQueue = activeFilter === "EXP" ? expQueue : cabQueue;

  // Helper: get the sessionStorage key for locked items
  const LOCK_KEY = `release_locks_${session.empCode}`;

  // Restore persisted lock state after queue loads
  useEffect(() => {
    if (loading) return;
    try {
      const stored = sessionStorage.getItem(LOCK_KEY);
      if (!stored) return;
      const lockedMap: Record<string, string> = JSON.parse(stored);
      // Mark EXP items
      setExpQueue(prev => prev.map(item => {
        const isTicket = item._releaseType === 'CAB_TICKET' || item._releaseType === 'EXP_TICKET';
        const key = `${item._releaseType || 'EXP_CRF'}_${isTicket ? (item.ticketId || item.crfId) : item.crfId}`;
        if (lockedMap[key] && !(item as any)._isUpcoming) {
          return { ...item, isMyInProgress: true, assignedDate: lockedMap[key] };
        }
        return item;
      }));
      // Mark CAB items
      setCabQueue(prev => prev.map(item => {
        const isTicket = item._releaseType === 'CAB_TICKET' || item._releaseType === 'EXP_TICKET';
        const key = `${item._releaseType || 'CAB_CRF'}_${isTicket ? (item.ticketId || item.crfId) : item.crfId}`;
        if (lockedMap[key] && !(item as any)._isUpcoming) {
          return { ...item, isMyInProgress: true, assignedDate: lockedMap[key] };
        }
        return item;
      }));
    } catch { /* ignore parse errors */ }
  }, [loading]);

  // Persist a lock to sessionStorage
  const persistLock = (releaseType: string, id: number) => {
    try {
      const stored = sessionStorage.getItem(LOCK_KEY);
      const lockedMap: Record<string, string> = stored ? JSON.parse(stored) : {};
      lockedMap[`${releaseType}_${id}`] = new Date().toLocaleString();
      sessionStorage.setItem(LOCK_KEY, JSON.stringify(lockedMap));
    } catch { /* ignore */ }
  };

  const handleExecuteDetails = async (req: PendingRequestItem & { _isRevert?: boolean; _releaseType?: string }) => {
    const isTicketType = req._releaseType === 'CAB_TICKET' || req._releaseType === 'EXP_TICKET';
    const displayId = (isTicketType ? (req.ticketId || req.crfId) : (req.crfId || req.ticketId)) as number;
    const releaseType = req._releaseType || 'EXP_CRF';

    // If already marked as locked in local state, skip lock API entirely
    if (req.isMyInProgress) {
      navigate(`/Release/ExecutionDetails?crfId=${displayId}`, { state: { request: req, isRevert: !!req._isRevert, releaseType } });
      return;
    }

    setLocking(displayId);
    const userId = req.userId || 0;

    let lockRes;
    if (releaseType === 'CAB_CRF') {
      lockRes = await cabWorkflow.cabLock(req.crfId, req.reqId, userId, session.empCode);
    } else if (releaseType === 'CAB_TICKET' || releaseType === 'EXP_TICKET') {
      lockRes = await cabWorkflow.ticketLock(displayId, req.reqId, userId, session.empCode);
    } else {
      lockRes = await workflow.lock(req.crfId, req.reqId, userId, session.empCode);
    }

    setLocking(null);

    if (!lockRes.success) {
      // Check if it's "already locked by you" (not by another user) — treat as success
      const msg = (lockRes.message || "").toLowerCase();
      const isAlreadyLockedByMe = msg.includes("already locked") && !msg.includes("another user");
      if (!isAlreadyLockedByMe) {
        alert(lockRes.message || "Unable to lock this release");
        return;
      }
    }

    // Lock succeeded or re-locked by same user — persist and update local state
    persistLock(releaseType, displayId);

    // Update local queue to show lock indicator immediately
    const updateFn = (items: typeof expQueue) =>
      items.map(item => {
        const isTicket = item._releaseType === 'CAB_TICKET' || item._releaseType === 'EXP_TICKET';
        const itemId = isTicket ? (item.ticketId || item.crfId) : item.crfId;
        if (itemId === displayId && item._releaseType === releaseType) {
          return { ...item, isMyInProgress: true, assignedDate: new Date().toLocaleString() };
        }
        return item;
      });
    if (activeFilter === 'EXP') setExpQueue(updateFn);
    else setCabQueue(updateFn);

    navigate(`/Release/ExecutionDetails?crfId=${displayId}`, { state: { request: req, isRevert: !!req._isRevert, releaseType } });
  };

  const mainContent = (
    <div className="h-screen w-full flex overflow-hidden text-slate-200 theme-transition">
      {/* Left Sidebar */}
      <aside className="flex-none w-72 p-4 flex flex-col h-full z-20">
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="glass-panel flex-1 rounded-2xl flex flex-col overflow-hidden relative"
        >
          {/* Branding */}
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

          {/* Navigation */}
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            <span className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/10 text-white font-medium shadow-[0_0_15px_rgba(255,255,255,0.05)] border border-white/10 cursor-default">
              <svg className="w-5 h-5 text-[#10B981]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"></path></svg>
              Action Queue
              {expQueue.filter(r => r.isMyInProgress).length + cabQueue.filter(r => r.isMyInProgress).length > 0 && (
                <span className="ml-auto px-2 py-0.5 rounded-md text-[10px] font-bold bg-red-500/20 text-red-400 border border-red-500/30 animate-pulse">{expQueue.filter(r => r.isMyInProgress).length + cabQueue.filter(r => r.isMyInProgress).length}</span>
              )}
            </span>
            <Link to="/Release/History" className="flex items-center gap-3 px-4 py-3 rounded-xl text-gray-400 hover:text-white hover:bg-white/5 transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
              Release History
            </Link>
          </div>

          {/* Profile Footer */}
          <div className="p-4 border-t border-white/5">
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/5 transition-colors">
              <div
                onClick={() => setClickCount(c => c + 1)}
                className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#10B981] to-[#047857] flex items-center justify-center shadow-[0_0_15px_rgba(16,185,129,0.3)] cursor-pointer"
              >
                <span className="text-white font-bold text-sm select-none">{session.empName?.substring(0, 2).toUpperCase() || "RT"}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white truncate">{session.empName || "Release Team"}</p>
                <p className="text-[10px] text-gray-400 font-mono truncate">{session.roleStatus}</p>
              </div>
            </div>
          </div>
        </motion.div>
      </aside>

      <Signature isActive={isSignatureActive} onClose={() => setIsSignatureActive(false)} redirectTo="/Dashboard/Release" />

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-full relative z-10 p-4 pl-0">
        <motion.header
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="glass-header rounded-2xl p-6 flex justify-between items-center mb-6 shadow-lg relative z-50"
        >
          <div>
            <h1 className="text-2xl font-light tracking-wide text-white">Operations Command</h1>
            <p className="text-xs text-gray-400 font-mono mt-1">Ready for Execution Queue</p>
          </div>
          <div className="flex items-center gap-6">
            <HeaderSearch />
            <button onClick={toggleTheme} aria-label="Toggle theme" className="relative p-2 text-gray-400 hover:text-[#0084FF] transition-colors bg-white/5 hover:bg-[#0084FF]/10 rounded-full border border-white/5">
              {!isLight ? (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
              ) : (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" /></svg>
              )}
            </button>
            <button onClick={() => { auth.logout(); navigate('/Login'); }} className="flex items-center gap-2 px-4 py-2 rounded-lg text-[10px] font-bold text-red-400 bg-red-500/10 hover:bg-red-500 hover:text-white border border-red-500/20 hover:border-red-500 transition-all tracking-widest uppercase">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg>
              Sign Out
            </button>
          </div>
        </motion.header>

        {/* KPI Row */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.2 }} className="glass-panel p-4 rounded-xl relative overflow-hidden group flex flex-col justify-center">
            <div className="absolute inset-0 bg-gradient-to-r from-[#10B981]/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <p className="text-[10px] uppercase tracking-widest text-gray-400 font-medium mb-1">Ready to Deploy</p>
            <h2 className="text-2xl font-semibold text-white neon-text-emerald">{expCount + cabCount}</h2>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.3 }} className="glass-panel p-4 rounded-xl relative overflow-hidden group flex flex-col justify-center">
            <div className="absolute inset-0 bg-gradient-to-r from-[#F59E0B]/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <p className="text-[10px] uppercase tracking-widest text-gray-400 font-medium mb-1 flex items-center gap-2">Upcoming <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span></p>
            <h2 className="text-2xl font-semibold text-white neon-text-amber">{expUpcomingCount + cabUpcomingCount}</h2>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.35 }} className="glass-panel p-4 rounded-xl relative overflow-hidden group flex flex-col justify-center">
            <div className="absolute inset-0 bg-gradient-to-r from-[#F59E0B]/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <p className="text-[10px] uppercase tracking-widest text-gray-400 font-medium mb-1">Expedite Pending</p>
            <h2 className="text-2xl font-semibold text-white">{filteredQueue.filter(r => !(r as any)._isUpcoming && String(r.requirementType) === "2").length}</h2>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.4 }} className="glass-panel p-4 rounded-xl relative overflow-hidden flex flex-col justify-center">
            <p className="text-[10px] uppercase tracking-widest text-gray-400 font-medium mb-1">Database Changes</p>
            <h2 className="text-2xl font-semibold text-white">{filteredQueue.filter(r => !(r as any)._isUpcoming && (String(r.requirementType) === "1" || String(r.requirementType) === "3")).length}</h2>
          </motion.div>
        </div>

        {/* Action Queue */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.6 }}
          className="glass-panel rounded-2xl flex-1 p-8 flex flex-col min-h-0"
        >
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg tracking-wide font-medium text-white flex items-center gap-3">
              <span className="w-2 h-2 rounded-full bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.8)] animate-pulse"></span>
              Execution Queue
            </h3>

            <div className="flex items-center gap-4">
              <button onClick={() => loadQueue(true)} className="p-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-gray-400 hover:text-white transition-all cursor-pointer" title="Refresh Queue">
                <svg className={`w-5 h-5 ${loading ? 'animate-spin [animation-direction:reverse] text-[#0084FF]' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
              </button>

              <div className="relative flex items-center bg-[#0B1120] p-1.5 rounded-2xl shadow-inner border border-white/5 gap-1">
                <button ref={expBtnRef} onClick={() => setActiveFilter('EXP')} className={`type-filter-btn relative z-10 flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-colors duration-300 cursor-pointer ${activeFilter === 'EXP' ? 'text-white' : 'text-gray-500 hover:text-white'}`}>
                  {activeFilter === 'EXP' && (
                    <motion.div layoutId="pill-bg-dashboard" className="absolute inset-0 z-[-1] rounded-xl bg-[#CC5500] shadow-[0_0_15px_rgba(204,85,0,0.4)]" transition={{ type: "spring", bounce: 0.25, duration: 0.5 }} />
                  )}
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                  EXP <span className={`badge ml-1 px-2 py-0.5 rounded-md text-[10px] transition-colors duration-300 ${activeFilter === 'EXP' ? 'bg-black/20 text-white' : expCount > 0 ? 'bg-orange-500/30 text-orange-300 font-bold ring-1 ring-orange-500/50 shadow-[0_0_8px_rgba(204,85,0,0.3)]' : 'bg-white/5 text-gray-400'}`}>{expCount}</span>
                </button>
                <button ref={cabBtnRef} onClick={() => setActiveFilter('CAB')} className={`type-filter-btn relative z-10 flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-colors duration-300 cursor-pointer ${activeFilter === 'CAB' ? 'text-white' : 'text-gray-500 hover:text-white'}`}>
                  {activeFilter === 'CAB' && (
                    <motion.div layoutId="pill-bg-dashboard" className="absolute inset-0 z-[-1] rounded-xl bg-[#007AFF] shadow-[0_0_15px_rgba(0,122,255,0.4)]" transition={{ type: "spring", bounce: 0.25, duration: 0.5 }} />
                  )}
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg>
                  CAB <span className={`badge ml-1 px-2 py-0.5 rounded-md text-[10px] transition-colors duration-300 ${activeFilter === 'CAB' ? 'bg-black/20 text-white' : cabCount > 0 ? 'bg-blue-500/30 text-blue-300 font-bold ring-1 ring-blue-500/50 shadow-[0_0_8px_rgba(0,122,255,0.3)]' : 'bg-white/5 text-gray-400'}`}>{cabCount}</span>
                </button>
              </div>
            </div>
          </div>


          <div className="flex-1 overflow-auto pr-2">
            {loading ? (
              <div className="flex flex-col items-center justify-center h-64">
                <div className="w-48 h-48 relative mb-2">
                  <DotLottiePlayer src={`${import.meta.env.BASE_URL}loading.lottie`} autoplay loop />
                </div>
                <p className="text-[#0084FF] font-mono text-[10px] uppercase tracking-widest animate-pulse font-bold mt-[-10px]">Syncing execution queue...</p>
              </div>
            ) : (
              <table className="release-table w-full">
                <thead><tr><th>ID</th><th>Mode</th><th>Requester</th><th>Status</th><th>Action</th></tr></thead>
                <AnimatePresence mode="wait">
                  <motion.tbody
                    key={activeFilter}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}
                  >
                    {filteredQueue.map((req, i) => {
                      const reqAny = req as any;
                      const numericId = (reqAny._releaseType === 'CAB_TICKET' || reqAny._releaseType === 'EXP_TICKET') ? (req.ticketId || req.crfId) : (req.crfId || req.ticketId);
                      const requestId = reqAny.reqId || reqAny.req_id;
                      const displayId = requestId || numericId; // For key and locking logic
                      const isLockedByOther = !!(req as any)._lockedByOther;
                      const isUpcoming = !!(req as any)._isUpcoming;
                      const isRevert = !!(req as any)._isRevert;

                      // Partial release detection for DUAL (requirementType=3) items
                      // Only triggers when exactly ONE side has released (the other is still pending)
                      const isDual = Number(req.requirementType) === 3;
                      const myRole = session.roleStatus?.toUpperCase() || '';
                      const isDbRole = myRole === 'DB_RELEASE';
                      const isAppRole = myRole === 'APPLICATION_RELEASE' || myRole === 'APP_RELEASE';
                      let waitingForOtherSide = false;
                      let waitingLabel = '';
                      let releasedByCode = '';
                      if (isDual && !isUpcoming) {
                        if (isRevert) {
                          const dbReverted = hasReleased(req.revertDbReleasedBy);
                          const appReverted = hasReleased(req.revertAppReleasedBy);
                          // DB person released their revert → waiting for APP
                          if (isDbRole && dbReverted && !appReverted) {
                            waitingForOtherSide = true;
                            waitingLabel = 'Waiting for APP Revert';
                            releasedByCode = req.revertDbReleasedBy || '';
                          }
                          // APP person released their revert → waiting for DB
                          if (isAppRole && appReverted && !dbReverted) {
                            waitingForOtherSide = true;
                            waitingLabel = 'Waiting for DB Revert';
                            releasedByCode = req.revertAppReleasedBy || '';
                          }
                        } else {
                          const dbReleased = hasReleased(req.dbReleasedBy);
                          const appReleased = hasReleased(req.appReleasedBy);
                          // DB person released → waiting for APP
                          if (isDbRole && dbReleased && !appReleased) {
                            waitingForOtherSide = true;
                            waitingLabel = 'Waiting for APP Release';
                            releasedByCode = req.dbReleasedBy || '';
                          }
                          // APP person released → waiting for DB
                          if (isAppRole && appReleased && !dbReleased) {
                            waitingForOtherSide = true;
                            waitingLabel = 'Waiting for DB Release';
                            releasedByCode = req.appReleasedBy || '';
                          }
                        }
                      }
                      return (
                        <motion.tr
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.3, delay: i * 0.05 }}
                          key={`${(req as any)._releaseType}-${displayId}${isUpcoming ? '-upcoming' : ''}`}
                          data-type={activeFilter}
                          className={`group ${isUpcoming ? 'opacity-40' : ''} ${isLockedByOther ? 'opacity-50 pointer-events-none' : ''} ${req.isMyInProgress ? 'release-in-progress' : ''}`}
                        >
                          <td>
                            {requestId ? (
                              <>
                                <div className="font-mono text-white text-sm font-bold">{requestId}</div>
                                <div className="text-[10px] text-gray-500 font-mono mt-0.5">#{numericId}</div>
                              </>
                            ) : (
                              <div className="font-mono text-white text-sm font-bold">#{numericId}</div>
                            )}
                          </td>
                          <td>
                            {(() => {
                              if ((req as any)._isRevert) {
                                return (
                                  <span className="px-2.5 py-1 rounded text-xs font-bold uppercase tracking-wider flex items-center gap-1 w-max bg-red-500/20 text-red-400 border border-red-500/30">
                                    <span className="w-1.5 h-1.5 rounded-full animate-pulse bg-red-500"></span>
                                    REVERT
                                  </span>
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
                                  <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-widest w-max bg-white/5 text-gray-400">
                                    {getRequirementTypeName(req.requirementType)}
                                  </span>
                                </div>
                              );
                            })()}
                          </td>
                          <td className="max-w-[200px] sm:max-w-[250px] md:max-w-[300px] lg:max-w-[400px]">
                            <div className="text-sm font-medium text-white truncate" title={req.userName || 'Unknown Requester'}>
                              {req.userName || 'Unknown Requester'}
                            </div>
                            <div className="text-xs text-gray-400 font-mono mt-0.5" title={req.userId?.toString() || 'N/A'}>
                              {req.userId || 'N/A'}
                            </div>
                          </td>
                          <td>
                            <div className="flex items-center gap-2">
                              {isUpcoming ? (
                                <>
                                  <span className="w-2 h-2 rounded-full bg-amber-500/50"></span>
                                  <div className="flex flex-col">
                                    <span className="text-amber-500/70 text-xs font-semibold uppercase tracking-wider">Pending {(req as any)._stepLabel}</span>
                                  </div>
                                </>
                              ) : waitingForOtherSide ? (
                                <>
                                  <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.6)]"></span>
                                  <div className="flex flex-col">
                                    <span className="text-emerald-400 text-xs font-semibold uppercase tracking-wider">✓ Your Side Released</span>
                                    <span className="text-[10px] text-emerald-400/60 font-mono mt-0.5">Released by {releasedByCode || 'N/A'}</span>
                                  </div>
                                </>
                              ) : req.isMyInProgress ? (
                                <>
                                  <span className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.8)] animate-pulse"></span>
                                  <div className="flex flex-col">
                                    <span className="text-red-400 text-xs font-semibold uppercase tracking-wider">Locked — Assigned to you</span>
                                    {req.assignedDate && <span className="text-[10px] text-red-400/60 font-mono">{req.assignedDate}</span>}
                                  </div>
                                </>
                              ) : isLockedByOther ? (
                                <>
                                  <span className="w-2 h-2 rounded-full bg-gray-500 shadow-[0_0_10px_rgba(107,114,128,0.5)]"></span>
                                  <div className="flex flex-col">
                                    <span className="text-gray-400 text-xs font-semibold uppercase tracking-wider">Locked By: {(req as any).assignedToName || req.assignedTo || 'Others'}</span>
                                    {(req as any).assignedToName && req.assignedTo && <span className="text-gray-500 text-[10px] font-mono">{req.assignedTo}</span>}
                                  </div>
                                </>
                              ) : (
                                <>
                                  <span className="w-2 h-2 rounded-full bg-[#10B981] shadow-[0_0_10px_#10B981]"></span>
                                  <span className="text-[#10B981] text-xs font-semibold uppercase tracking-wider">Approved for Release</span>
                                </>
                              )}
                            </div>
                          </td>
                          <td>
                            <button
                              onClick={() => handleExecuteDetails(req)}
                              disabled={locking === displayId || isLockedByOther || isUpcoming || waitingForOtherSide}
                              className={`px-6 py-2 rounded-xl text-xs font-bold w-full whitespace-nowrap text-center inline-block transition-all duration-300 disabled:opacity-50 ${waitingForOtherSide ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30 cursor-not-allowed !opacity-70' : isUpcoming ? 'bg-gray-800/50 text-gray-600 border border-gray-700/50 cursor-not-allowed' : req.isMyInProgress ? 'badge-in-progress' : isLockedByOther ? 'bg-gray-800 text-gray-500 border border-gray-700' : 'btn-review'}`}
                            >
                              {locking === displayId ? 'Locking...' : waitingForOtherSide ? waitingLabel : isUpcoming ? 'Not Ready' : isLockedByOther ? 'Locked' : req.isMyInProgress ? 'View Details' : 'Execute Details'}
                            </button>
                          </td>
                        </motion.tr>
                      );
                    })}
                  </motion.tbody>
                </AnimatePresence>
              </table>
            )}
          </div>
        </motion.div>
      </main>
    </div>
  );

  return (
    <>
      {mainContent}
    </>
  );
}
