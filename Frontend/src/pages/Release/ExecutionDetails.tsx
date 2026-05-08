import { useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { workflow, cabWorkflow, auth, getRequirementTypeName } from "../../services/api";
import type { PendingRequestItem } from "../../services/api";
import DocumentViewer from "../../components/DocumentViewer";
import confetti from "canvas-confetti";
import '../../assets/css/pages/release-details-common.css';
import '../../assets/css/pages/release-execution-details.css';

export default function ExecutionDetails() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [showReleaseModal, setShowReleaseModal] = useState(false);
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [comment, setComment] = useState("");
  const [returnReason, setReturnReason] = useState("");
  const [processing, setProcessing] = useState(false);

  const session = auth.getSession();
  const crfId = parseInt(searchParams.get("crfId") || "0");
  const req: PendingRequestItem | null = (location.state as any)?.request || null;
  const isRevert: boolean = (location.state as any)?.isRevert || false;
  const releaseType: string = (location.state as any)?.releaseType || 'EXP_CRF';

  const [activeDoc, setActiveDoc] = useState<{ base64: string, type: string, name: string } | null>(null);
  const isLight = document.documentElement.classList.contains('light');

  const requestId = `${crfId}`;
  const actionLabel = isRevert ? "Revert Release" : "Release Execution";

  const handleConfirmRelease = async () => {
    setProcessing(true);
    const userId = req?.userId || 0;
    const reqIdStr = req?.reqId;
    const finalComment = comment.trim() !== "" ? comment.trim() : actionLabel;
    let res;

    if (isRevert) {
      const displayId = (releaseType === 'CAB_TICKET' || releaseType === 'EXP_TICKET') ? (req?.ticketId || crfId) : crfId;
      if (releaseType === 'CAB_CRF') {
        res = await cabWorkflow.cabCrfRevertRelease(displayId, reqIdStr, userId, session.empCode, finalComment);
      } else if (releaseType === 'CAB_TICKET') {
        res = await cabWorkflow.cabTicketRevertRelease(displayId, reqIdStr, userId, session.empCode, finalComment);
      } else if (releaseType === 'EXP_TICKET') {
        res = await workflow.revertRelease(displayId, reqIdStr, userId, session.empCode, finalComment);
      } else {
        res = await workflow.expCrfRevertRelease(displayId, reqIdStr, userId, session.empCode, finalComment);
      }
    } else if (releaseType === 'CAB_CRF') {
      res = await cabWorkflow.cabCrfRelease(crfId, reqIdStr, userId, session.empCode, finalComment);
    } else if (releaseType === 'CAB_TICKET' || releaseType === 'EXP_TICKET') {
      const ticketId = req?.ticketId || crfId;
      res = await cabWorkflow.cabTicketRelease(ticketId, reqIdStr, userId, session.empCode, finalComment);
    } else {
      res = await workflow.release(crfId, reqIdStr, userId, session.empCode, finalComment);
    }
    setProcessing(false);

    if (res.success) {
      confetti({
        particleCount: 150,
        spread: 80,
        origin: { y: 0.6 },
        colors: ['#0084FF', '#10B981', '#f59e0b']
      });
      setShowSuccess(true);
      setTimeout(() => {
        setShowReleaseModal(false);
        setShowSuccess(false);
        navigate("/Dashboard/Release");
      }, 3800);
    }
  };

  const handleConfirmReturn = async () => {
    setProcessing(true);
    const userId = req?.userId || 0;
    const reqIdStr = req?.reqId;
    const finalReason = returnReason.trim() !== "" ? returnReason.trim() : "Returned by " + session.empCode;
    let res;

    if (releaseType === 'CAB_CRF') {
      res = await cabWorkflow.cabCrfReturn(crfId, reqIdStr, userId, session.empCode, finalReason);
    } else if (releaseType === 'CAB_TICKET' || releaseType === 'EXP_TICKET') {
      const ticketId = req?.ticketId || crfId;
      res = await cabWorkflow.cabTicketReturn(ticketId, reqIdStr, userId, session.empCode, finalReason);
    } else {
      res = await workflow.returnRequest(crfId, reqIdStr, userId, session.empCode, finalReason);
    }
    setProcessing(false);

    if (res.success) {
      setShowSuccess(true);
      setTimeout(() => {
        setShowReturnModal(false);
        setShowSuccess(false);
        navigate("/Dashboard/Release");
      }, 3000);
    }
  };

  return (
    <div className={`h-screen w-full flex flex-col overflow-hidden ${isLight ? 'bg-[#e6eef5] text-slate-800' : 'bg-[#0F172A] text-slate-200'} p-4 transition-colors duration-300`}>
      {/* Header */}
      <header className="glass-header rounded-2xl mb-4 px-6 py-4 flex items-center justify-between shrink-0 fade-in">
        <div className="flex items-center gap-4">
          <Link to="/Dashboard/Release" className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors group">
            <svg className="w-5 h-5 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path></svg>
            <span className="text-xs font-bold tracking-widest uppercase">Back to Dashboard</span>
          </Link>
          <div className="h-6 w-px bg-white/10"></div>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#0084FF]/20 flex items-center justify-center">
              <svg className="w-4 h-4 text-[#0084FF]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"></path></svg>
            </div>
            <h1 className={`text-lg font-semibold ${isLight ? 'text-slate-800' : 'text-white'} tracking-wide`}>{isRevert ? 'Revert Release' : 'Release Execution'}</h1>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-500 font-mono">
          <span className={`w-2 h-2 rounded-full ${isRevert ? 'bg-red-500' : 'bg-amber-500'} animate-pulse`}></span>
          <span className={`uppercase tracking-widest font-bold ${isRevert ? 'text-red-400' : 'text-amber-400'}`}>{isRevert ? 'REVERT' : 'EXPEDITE'}</span>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto pr-1">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 fade-in">
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-6">
            <div className="glass-panel rounded-2xl p-6 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-bl-full -mr-8 -mt-8 transition-transform group-hover:scale-110"></div>
              <div className="flex items-center gap-3 mb-6 relative">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
                  <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                </div>
                <h2 className={`text-xl font-bold ${isLight ? 'text-slate-800' : 'text-white'} tracking-wide`}>Request Overview</h2>
              </div>
              <div className="space-y-5 relative">
                <div><label className="field-label text-blue-400/80">Requester</label><div className={`${isLight ? 'text-slate-900' : 'text-white'} text-lg font-medium`}>{req?.userName || 'Unknown Requester'}<span className="text-sm text-gray-400 font-mono ml-2">({req?.userId || 'N/A'})</span></div></div>
                <div className={`p-4 rounded-xl ${isLight ? 'bg-black/5 border-black/10' : 'bg-slate-800/50 border-slate-700/50'}`}>
                  <label className="field-label text-blue-400/80">Subject</label>
                  <div className={`${isLight ? 'text-slate-700' : 'text-gray-300'} leading-relaxed break-words whitespace-pre-wrap max-h-32 overflow-y-auto custom-scrollbar pr-2`}>{req?.subject || 'N/A'}</div>
                </div>
                <div className={`p-4 rounded-xl ${isLight ? 'bg-black/5 border-black/10' : 'bg-slate-800/50 border-slate-700/50'}`}>
                  <label className="field-label text-blue-400/80">Description</label>
                  <div className={`${isLight ? 'text-slate-700' : 'text-gray-300'} leading-relaxed break-words whitespace-pre-wrap max-h-40 overflow-y-auto custom-scrollbar pr-2`}>{req?.description || req?.projectName || 'N/A'}</div>
                </div>
                <div className={`p-4 rounded-xl ${isLight ? 'bg-black/5 border-black/10' : 'bg-slate-800/50 border-slate-700/50'}`}>
                  <label className="field-label text-blue-400/80">Changes Incorporated</label>
                  <div className={`${isLight ? 'text-slate-700' : 'text-gray-300'} leading-relaxed break-words whitespace-pre-wrap max-h-40 overflow-y-auto custom-scrollbar pr-2`}>{req?.changesToBeMade || 'N/A'}</div>
                </div>
              </div>
            </div>

            {/* Deployment Details */}
            <div className="glass-panel rounded-2xl p-6 border-t-[3px] border-t-emerald-500/50">
              <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4">Deployment Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex flex-col h-full">
                  <div className="flex justify-between items-start">
                    <label className="field-label">Publish Path</label>
                    {req?.publishPath && req.publishPath !== 'N/A' && (
                      <button onClick={() => navigator.clipboard.writeText(req.publishPath!)} className="text-gray-500 hover:text-[#0084FF] transition-colors -mt-1" title="Copy Publish Path">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg>
                      </button>
                    )}
                  </div>
                  <div className={`field-input-readonly font-mono text-xs break-all whitespace-pre-wrap max-h-32 overflow-y-auto custom-scrollbar flex-1 ${isLight ? 'bg-black/5 border-black/10 text-slate-700' : 'bg-slate-900/50'}`}>
                    {req?.publishPath || 'N/A'}
                  </div>
                </div>
                <div className="min-w-0 flex flex-col h-full">
                  <div className="flex justify-between items-start">
                    <label className="field-label">Commit ID</label>
                    {req?.commitId && req.commitId !== 'N/A' && (
                      <button onClick={() => navigator.clipboard.writeText(req.commitId!)} className="text-gray-500 hover:text-emerald-400 transition-colors -mt-1" title="Copy Commit ID">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg>
                      </button>
                    )}
                  </div>
                  <div className={`field-input-readonly font-mono text-xs break-all whitespace-pre-wrap max-h-32 overflow-y-auto custom-scrollbar ${isLight ? 'bg-black/5 border-black/10 text-slate-700' : 'bg-slate-900/50 text-emerald-400'} flex-1`}>
                    {req?.commitId || 'N/A'}
                  </div>
                </div>
              </div>
            </div>

            {/* Documents */}
            <div className="glass-panel rounded-2xl p-6 border-t-[3px] border-t-[#0084FF]/50 relative mt-6">
              <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4">Attached Documents</h3>
              {req?.uatSignoffDocument || req?.productionReleaseDocument ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {req.uatSignoffDocument && (
                    <button onClick={() => setActiveDoc({ base64: req.uatSignoffDocument!, type: '', name: 'UAT Signoff Document' })} className={`flex items-center w-full gap-4 p-4 rounded-xl border transition-colors text-left group ${isLight ? 'border-slate-200 hover:border-[#0084FF]/50 bg-slate-50 hover:bg-[#0084FF]/10' : 'border-white/10 hover:border-[#0084FF]/50 bg-white/5 hover:bg-[#0084FF]/10'}`}>
                      <div className="shrink-0 p-3 rounded-lg bg-[#0084FF]/20 text-[#0084FF]">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className={`text-sm font-bold group-hover:text-[#0084FF] transition-colors truncate ${isLight ? 'text-slate-800' : 'text-white'}`}>UAT Signoff</div>
                        <div className={`text-[10px] font-mono mt-1 truncate ${isLight ? 'text-slate-500' : 'text-gray-400'}`}>UAT Document</div>
                      </div>
                    </button>
                  )}
                  {req.productionReleaseDocument && (
                    <button onClick={() => setActiveDoc({ base64: req.productionReleaseDocument!, type: '', name: 'Production Release Document' })} className={`flex items-center w-full gap-4 p-4 rounded-xl border transition-colors text-left group ${isLight ? 'border-slate-200 hover:border-emerald-500/50 bg-slate-50 hover:bg-emerald-500/10' : 'border-white/10 hover:border-emerald-500/50 bg-white/5 hover:bg-emerald-500/10'}`}>
                      <div className="shrink-0 p-3 rounded-lg bg-emerald-500/20 text-emerald-400">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className={`text-sm font-bold group-hover:text-emerald-400 transition-colors truncate ${isLight ? 'text-slate-800' : 'text-white'}`}>Production Rel.</div>
                        <div className={`text-[10px] font-mono mt-1 truncate ${isLight ? 'text-slate-500' : 'text-gray-400'}`}>Prod Document</div>
                      </div>
                    </button>
                  )}
                </div>
              ) : (
                <div className="text-sm text-gray-500 italic">No documents found.</div>
              )}
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-6 lg:sticky lg:top-0 h-fit">
            <div className="glass-panel rounded-2xl p-6">
              <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4 border-b border-white/10 pb-2">Details</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center"><span className="text-sm text-gray-400">CRF ID</span><span className={`text-sm font-mono font-bold ${isLight ? 'text-slate-800 bg-black/5' : 'text-white bg-white/5'} px-2 py-1 rounded-md`}>{requestId}</span></div>
                {req?.reqId && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-400">Request ID</span>
                    <span className={`text-sm font-mono font-bold text-orange-400 ${isLight ? 'bg-black/5' : 'bg-white/5'} px-2 py-1 rounded-md`}>{req.reqId}</span>
                  </div>
                )}
                <div className="flex justify-between items-center"><span className="text-sm text-gray-400">Requester</span><span className={`text-sm ${isLight ? 'text-slate-800' : 'text-white'} font-medium`}>{req?.userName || 'N/A'} <span className="text-xs text-gray-400 font-mono">({req?.userId || 'N/A'})</span></span></div>
                <div className="flex justify-between items-center"><span className="text-sm text-gray-400">Mobile Number</span><span className={`text-sm font-mono ${isLight ? 'text-slate-800' : 'text-white'} tracking-wide`}>{req?.mobileNumber || req?.mobileNo || 'N/A'}</span></div>
                <div className="flex justify-between items-center"><span className="text-sm text-gray-400">Requirement Type</span><span className={`text-sm ${isLight ? 'text-slate-800' : 'text-white'}`}>{getRequirementTypeName(req?.requirementType)}</span></div>
                {req?.reasonForExpedite && <div className="flex justify-between items-center"><span className="text-sm text-gray-400">Expedite Reason</span><span className="text-sm text-amber-500 font-medium">{req.reasonForExpedite}</span></div>}
                <div className="flex justify-between items-center"><span className="text-sm text-gray-400">QA Status</span>
                  <span className="flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-emerald-400 bg-emerald-400/10 px-2 py-1 rounded-md border border-emerald-400/20">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg> {req?.qaStatus || 'N/A'}
                  </span>
                </div>
              </div>
            </div>

            {/* Action Card */}
            <div className="glass-panel rounded-2xl p-6 bg-gradient-to-b from-slate-800/80 to-slate-900/80 border border-emerald-500/20 shadow-[0_4px_30px_rgba(16,185,129,0.05)] text-center relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-bl-full -mr-8 -mt-8 pointer-events-none"></div>
              <h3 className={`text-sm font-bold ${isLight ? 'text-slate-800' : 'text-white'} mb-4 relative z-10`}>Ready for Deployment</h3>
              <div className="w-full bg-emerald-500/10 h-1.5 rounded-full mb-6 overflow-hidden relative z-10">
                <div className="bg-emerald-400 h-full w-full rounded-full animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.5)]"></div>
              </div>
              <button onClick={() => setShowReleaseModal(true)} className="w-full mb-4 px-6 py-4 text-sm font-bold text-white bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 rounded-xl transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:shadow-[0_0_30px_rgba(16,185,129,0.5)] tracking-widest uppercase flex items-center justify-center gap-2 group relative z-10 border border-emerald-400/30">
                <svg className="w-5 h-5 group-hover:-translate-y-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                Confirm Release
              </button>
              <button onClick={() => setShowReturnModal(true)} className={`w-full px-6 py-3 text-xs font-bold text-red-400/80 ${isLight ? 'hover:text-red-700' : 'hover:text-red-300'} bg-red-500/5 border border-red-500/20 hover:border-red-500/50 hover:bg-red-500/20 rounded-xl transition-all tracking-widest uppercase relative z-10 flex items-center justify-center gap-2`}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
                Return to Requester
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Release Confirm Modal */}
      {showReleaseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => { if (!showSuccess) { setShowReleaseModal(false); setComment(''); } }}></div>
          <div className="relative w-full max-w-md glass-panel border border-emerald-500/30 rounded-2xl shadow-[0_0_60px_rgba(16,185,129,0.15)] overflow-hidden" style={{ minHeight: '340px' }}>
            {!showSuccess ? (
              <div className="p-8 text-center flex flex-col items-center justify-center">
                <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-6 border border-emerald-500/20 shadow-[0_0_20px_rgba(16,185,129,0.2)]">
                  <svg className="w-8 h-8 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                </div>
                <h2 className="text-xl font-semibold text-white tracking-wide mb-2">Confirm Release</h2>
                <p className="text-sm text-gray-400 mb-4">This will deploy <span className="text-white font-mono font-bold">{requestId}</span> to Production.</p>
                <div className="w-full mb-6 text-left">
                  <label className="field-label">Release Comment (Optional)</label>
                  <textarea className="field-input resize-none h-20" placeholder="Add release notes..." maxLength={150} value={comment} onChange={e => setComment(e.target.value)}></textarea>
                  <div className="text-right text-[10px] text-gray-500 mt-1 font-mono">{comment.length}/150</div>
                </div>
                <div className="flex gap-4 w-full">
                  <button onClick={() => { setShowReleaseModal(false); setComment(''); }} className="flex-1 px-6 py-3 text-sm text-gray-400 hover:text-white border border-white/10 hover:border-white/30 rounded-xl transition-all">Cancel</button>
                  <button onClick={handleConfirmRelease} disabled={processing} className="flex-1 px-6 py-3 rounded-xl text-sm font-bold bg-emerald-500 hover:bg-emerald-400 text-white shadow-[0_0_15px_rgba(16,185,129,0.4)] transition-all disabled:opacity-50">
                    {processing ? 'Releasing...' : 'Confirm'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-8 flex flex-col items-center justify-center text-center bg-gradient-to-br from-emerald-900/60 to-slate-900/95 rounded-2xl h-full" style={{ minHeight: '340px' }}>
                <div className="w-20 h-20 rounded-full bg-emerald-500/20 flex items-center justify-center mb-6 border border-emerald-500/30 shadow-[0_0_30px_rgba(16,185,129,0.3)]">
                  <svg className="w-10 h-10 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                </div>
                <h2 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-emerald-300 to-white">Release Successful!</h2>
                <p className="text-emerald-100/70 text-sm mt-3 font-medium"><span className="font-mono text-emerald-300 font-bold px-2 py-1 bg-emerald-500/10 rounded border border-emerald-500/20">{requestId}</span> is now live.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Return Modal */}
      {showReturnModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => { if (!showSuccess) { setShowReturnModal(false); setReturnReason(''); } }}></div>
          <div className="relative w-full max-w-lg glass-panel border border-red-500/30 rounded-2xl shadow-[0_0_60px_rgba(239,68,68,0.15)]" style={{ minHeight: '340px' }}>
            {!showSuccess ? (
              <div className="p-8">
                <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-6 border border-red-500/20 shadow-[0_0_20px_rgba(239,68,68,0.2)]">
                  <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"></path></svg>
                </div>
                <h2 className="text-xl font-semibold text-white text-center tracking-wide mb-2">Return Request</h2>
                <p className="text-sm text-gray-400 text-center mb-6">Send <span className="text-white font-mono font-bold">{requestId}</span> back to the requester.</p>
                <div className="mb-6">
                  <label className="field-label">Return Reason <span className="text-red-500">*</span></label>
                  <textarea className="field-input resize-none h-28" placeholder="Describe the reason..." maxLength={150} value={returnReason} onChange={e => setReturnReason(e.target.value)}></textarea>
                  <div className="text-right text-[10px] text-gray-500 mt-1 font-mono">{returnReason.length}/150</div>
                </div>
                <div className="flex gap-4">
                  <button onClick={() => { setShowReturnModal(false); setReturnReason(''); }} className="flex-1 px-6 py-3 text-sm text-gray-400 hover:text-white border border-white/10 hover:border-white/30 rounded-xl transition-all">Cancel</button>
                  <button onClick={handleConfirmReturn} disabled={processing || !returnReason.trim()} className="flex-1 px-6 py-3 rounded-xl text-sm font-bold bg-red-500/80 hover:bg-red-500 text-white border border-red-500/50 transition-all disabled:opacity-50">
                    {processing ? 'Processing...' : 'Confirm Return'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-8 flex flex-col items-center justify-center text-center bg-gradient-to-br from-red-900/60 to-slate-900/95 rounded-2xl h-full" style={{ minHeight: '340px' }}>
                <div className="w-20 h-20 rounded-full bg-red-500/20 flex items-center justify-center mb-6 border border-red-500/30 shadow-[0_0_30px_rgba(239,68,68,0.3)]">
                  <svg className="w-10 h-10 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                </div>
                <h2 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-red-300 to-white">Returned!</h2>
                <p className="text-red-100/70 text-sm mt-3 font-medium">Request <span className="font-mono text-red-300 font-bold px-2 py-1 bg-red-500/10 rounded border border-red-500/20">{requestId}</span> has been returned.</p>
              </div>
            )}
          </div>
        </div>
      )}
      {/* Document Viewer Modal */}
      {activeDoc && (
        <DocumentViewer
          base64Data={activeDoc.base64}
          contentType={activeDoc.type}
          fileName={activeDoc.name}
          onClose={() => setActiveDoc(null)}
        />
      )}
    </div>
  );
}
