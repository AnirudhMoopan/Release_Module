import { useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { workflow, cabWorkflow, auth, getRequirementTypeName } from "../../services/api";
import type { PendingRequestItem } from "../../services/api";
import DocumentViewer from "../../components/DocumentViewer";
import '../../assets/css/pages/release-details-common.css';
import '../../assets/css/pages/release-execution-details.css';

export default function ApproverDetails() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [comment, setComment] = useState("");
  const [rejectReason, setRejectReason] = useState("");
  const [processing, setProcessing] = useState(false);
  const [resultMsg, setResultMsg] = useState("");

  const session = auth.getSession();
  const crfId = parseInt(searchParams.get("crfId") || "0");

  // Get request data passed via Router state from Approver dashboard
  const req: PendingRequestItem | null = (location.state as any)?.request || null;
  const stepOrder: number = (location.state as any)?.stepOrder || session.stepOrder;
  const isRevert: boolean = (location.state as any)?.isRevert || false;
  const releaseType: string = (location.state as any)?.releaseType || 'EXP_CRF';

  const [activeDoc, setActiveDoc] = useState<{ base64: string, type: string, name: string } | null>(null);
  const isLight = document.documentElement.classList.contains('light');

  const requestId = `${crfId}`;
  const actionLabel = stepOrder === 1 ? "Recommend" :
    stepOrder === 2 ? "Verify" :
      "Approve";

  const commentLabel = stepOrder === 1 ? "Recommended" :
    stepOrder === 2 ? "Verified" :
      "Approved";

  const handleApprove = async () => {
    setProcessing(true);
    setResultMsg("");

    const userId = req?.userId || 0;
    const reqIdStr = req?.reqId;
    const finalComment = comment.trim() !== "" ? comment.trim() : commentLabel;
    let res;

    if (isRevert) {
      const displayId = (releaseType === 'CAB_TICKET' || releaseType === 'EXP_TICKET') ? (req?.ticketId || crfId) : crfId;

      if (releaseType === 'CAB_CRF') {
        switch (stepOrder) {
          case 1: res = await cabWorkflow.cabCrfRevertRecommend(displayId, reqIdStr, userId, session.empCode, finalComment); break;
          case 2: res = await cabWorkflow.cabCrfRevertVerify(displayId, reqIdStr, userId, session.empCode, finalComment); break;
          case 3: res = await cabWorkflow.cabCrfRevertApprove(displayId, reqIdStr, userId, session.empCode, finalComment); break;
          default: res = { success: false, message: "Unknown step" };
        }
      } else if (releaseType === 'CAB_TICKET') {
        switch (stepOrder) {
          case 1: res = await cabWorkflow.cabTicketRevertRecommend(displayId, reqIdStr, userId, session.empCode, finalComment); break;
          case 2: res = await cabWorkflow.cabTicketRevertVerify(displayId, reqIdStr, userId, session.empCode, finalComment); break;
          case 3: res = await cabWorkflow.cabTicketRevertApprove(displayId, reqIdStr, userId, session.empCode, finalComment); break;
          default: res = { success: false, message: "Unknown step" };
        }
      } else if (releaseType === 'EXP_TICKET') {
        switch (stepOrder) {
          case 1: res = await workflow.revertRecommend(displayId, reqIdStr, userId, session.empCode, finalComment); break;
          case 2: res = await workflow.revertVerify(displayId, reqIdStr, userId, session.empCode, finalComment); break;
          case 3: res = await workflow.revertApprove(displayId, reqIdStr, userId, session.empCode, finalComment); break;
          default: res = { success: false, message: "Unknown step" };
        }
      } else { // Default EXP_CRF revert
        switch (stepOrder) {
          case 1: res = await workflow.expCrfRevertRecommend(displayId, reqIdStr, userId, session.empCode, finalComment); break;
          case 2: res = await workflow.expCrfRevertVerify(displayId, reqIdStr, userId, session.empCode, finalComment); break;
          case 3: res = await workflow.expCrfRevertApprove(displayId, reqIdStr, userId, session.empCode, finalComment); break;
          default: res = { success: false, message: "Unknown step" };
        }
      }
    } else if (releaseType === 'CAB_CRF') {
      switch (stepOrder) {
        case 1: res = await cabWorkflow.cabCrfRecommend(crfId, reqIdStr, userId, session.empCode, finalComment); break;
        case 2: res = await cabWorkflow.cabCrfVerify(crfId, reqIdStr, userId, session.empCode, finalComment); break;
        case 3: res = await cabWorkflow.cabCrfApprove(crfId, reqIdStr, userId, session.empCode, finalComment); break;
        default: res = { success: false, message: "Unknown step" };
      }
    } else if (releaseType === 'CAB_TICKET' || releaseType === 'EXP_TICKET') {
      const ticketId = req?.ticketId || crfId;
      switch (stepOrder) {
        case 1: res = await cabWorkflow.cabTicketRecommend(ticketId, reqIdStr, userId, session.empCode, finalComment); break;
        case 2: res = await cabWorkflow.cabTicketVerify(ticketId, reqIdStr, userId, session.empCode, finalComment); break;
        case 3: res = await cabWorkflow.cabTicketApprove(ticketId, reqIdStr, userId, session.empCode, finalComment); break;
        default: res = { success: false, message: "Unknown step" };
      }
    } else {
      // Default: EXP CRF
      switch (stepOrder) {
        case 1: res = await workflow.recommend(crfId, reqIdStr, userId, session.empCode, finalComment); break;
        case 2: res = await workflow.verify(crfId, reqIdStr, userId, session.empCode, finalComment); break;
        case 3: res = await workflow.approve(crfId, reqIdStr, userId, session.empCode, finalComment); break;
        default: res = { success: false, message: "Unknown step" };
      }
    }

    setProcessing(false);
    if (res.success) {
      setResultMsg("Action completed successfully!");
      setShowSuccess(true);
      setTimeout(() => {
        setShowApproveModal(false);
        setShowSuccess(false);
        navigate("/Dashboard/Approver");
      }, 3000);
    } else {
      setResultMsg(res.message || "Action failed");
    }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) return;
    setProcessing(true);
    setResultMsg("");

    const userId = req?.userId || 0;
    const reqIdStr = req?.reqId;
    const finalReason = rejectReason.trim() !== "" ? rejectReason.trim() : "Returned by " + session.empCode;
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
      setResultMsg("Request returned successfully!");
      setShowSuccess(true);
      setTimeout(() => {
        setShowRejectModal(false);
        setShowSuccess(false);
        navigate("/Dashboard/Approver");
      }, 3000);
    } else {
      setResultMsg(res.message || "Return failed");
    }
  };

  return (
    <div className="h-screen w-full flex flex-col overflow-hidden text-slate-200 p-4">
      {/* Header */}
      <header className="glass-header rounded-2xl mb-4 px-6 py-4 flex items-center justify-between shrink-0 fade-in">
        <div className="flex items-center gap-4">
          <Link to="/Dashboard/Approver" className={`flex items-center gap-2 transition-colors group ${isLight ? 'text-gray-500 hover:text-gray-900' : 'text-gray-400 hover:text-white'}`}>
            <svg className="w-5 h-5 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path></svg>
            <span className="text-xs font-bold tracking-widest uppercase">Back to Dashboard</span>
          </Link>
          <div className={`h-6 w-px ${isLight ? 'bg-black/10' : 'bg-white/10'}`}></div>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#0084FF]/20 flex items-center justify-center">
              <svg className="w-4 h-4 text-[#0084FF]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"></path></svg>
            </div>
            <h1 className={`text-lg font-semibold tracking-wide ${isLight ? 'text-gray-900' : 'text-white'}`}>{actionLabel} Review</h1>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-500 font-mono">
          <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
          <span className={`uppercase tracking-widest font-bold ${isRevert ? 'text-red-400' : 'text-amber-400'}`}>{isRevert ? 'REVERT' : 'EXPEDITE'}</span>
        </div>
      </header>

      {/* Result message */}
      {resultMsg && (
        <div className={`mb-4 text-center text-sm font-semibold py-3 px-4 rounded-xl ${resultMsg.includes('success') ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/20 text-red-400 border border-red-500/20'}`}>
          {resultMsg}
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto pr-1">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 fade-in">
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Overview */}
            <div className="glass-panel rounded-2xl p-6 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-bl-full -mr-8 -mt-8 transition-transform group-hover:scale-110"></div>
              <div className="flex items-center gap-3 mb-6 relative">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
                  <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                </div>
                <h2 className={`text-xl font-bold tracking-wide ${isLight ? 'text-gray-900' : 'text-white'}`}>Request Overview</h2>
              </div>
              <div className="space-y-5 relative">
                <div><label className="field-label text-blue-400/80">Requester</label><div className={`text-lg font-medium ${isLight ? 'text-gray-900' : 'text-white'}`}>{req?.userName || 'Unknown Requester'}<span className="text-sm text-gray-400 font-mono ml-2">({req?.userId || 'N/A'})</span></div></div>
                <div className={`p-4 rounded-xl border ${isLight ? 'bg-black/5 border-black/10' : 'bg-slate-800/50 border-slate-700/50'}`}>
                  <label className="field-label text-blue-400/80">Subject</label>
                  <div className={`leading-relaxed break-words whitespace-pre-wrap max-h-32 overflow-y-auto custom-scrollbar pr-2 ${isLight ? 'text-gray-800' : 'text-gray-300'}`}>{req?.subject || 'N/A'}</div>
                </div>
                <div className={`p-4 rounded-xl border ${isLight ? 'bg-black/5 border-black/10' : 'bg-slate-800/50 border-slate-700/50'}`}>
                  <label className="field-label text-blue-400/80">Description</label>
                  <div className={`leading-relaxed break-words whitespace-pre-wrap max-h-40 overflow-y-auto custom-scrollbar pr-2 ${isLight ? 'text-gray-800' : 'text-gray-300'}`}>{req?.description || req?.projectName || 'N/A'}</div>
                </div>
                <div className={`p-4 rounded-xl border ${isLight ? 'bg-black/5 border-black/10' : 'bg-slate-800/50 border-slate-700/50'}`}>
                  <label className="field-label text-blue-400/80">Changes Incorporated</label>
                  <div className={`leading-relaxed break-words whitespace-pre-wrap max-h-40 overflow-y-auto custom-scrollbar pr-2 ${isLight ? 'text-gray-800' : 'text-gray-300'}`}>{req?.changesToBeMade || 'N/A'}</div>
                </div>
              </div>
            </div>

            {/* Deployment Details */}
            <div className="glass-panel rounded-2xl p-6 border-t-[3px] border-t-emerald-500/50">
              <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4">Deployment Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div><label className="field-label">Publish Path</label><div className="field-input-readonly font-mono text-xs break-all whitespace-pre-wrap max-h-32 overflow-y-auto custom-scrollbar bg-slate-900/50" title={req?.publishPath || ''}>{req?.publishPath || 'N/A'}</div></div>
                <div className="min-w-0"><label className="field-label">Commit ID</label><div className="field-input-readonly font-mono text-xs break-all whitespace-pre-wrap max-h-32 overflow-y-auto custom-scrollbar bg-slate-900/50 text-emerald-400" title={req?.commitId || ''}>{req?.commitId || 'N/A'}</div></div>
              </div>
            </div>

            {/* Documents */}
            <div className="glass-panel rounded-2xl p-6 border-t-[3px] border-t-[#0084FF]/50 relative mt-6">
              <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4">Attached Documents</h3>
              {req?.uatSignoffDocument || req?.productionReleaseDocument ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {req.uatSignoffDocument && (
                    <button onClick={() => setActiveDoc({ base64: req.uatSignoffDocument!, type: '', name: 'UAT Signoff Document' })} className="flex items-center w-full gap-4 p-4 rounded-xl border border-white/10 hover:border-[#0084FF]/50 bg-white/5 hover:bg-[#0084FF]/10 transition-colors text-left group">
                      <div className="shrink-0 p-3 rounded-lg bg-[#0084FF]/20 text-[#0084FF]">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-bold text-white group-hover:text-[#0084FF] transition-colors truncate">UAT Signoff</div>
                        <div className="text-[10px] text-gray-400 font-mono mt-1 truncate">UAT Document</div>
                      </div>
                    </button>
                  )}
                  {req.productionReleaseDocument && (
                    <button onClick={() => setActiveDoc({ base64: req.productionReleaseDocument!, type: '', name: 'Production Release Document' })} className="flex items-center w-full gap-4 p-4 rounded-xl border border-white/10 hover:border-emerald-500/50 bg-white/5 hover:bg-emerald-500/10 transition-colors text-left group">
                      <div className="shrink-0 p-3 rounded-lg bg-emerald-500/20 text-emerald-400">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-bold text-white group-hover:text-emerald-400 transition-colors truncate">Production Rel.</div>
                        <div className="text-[10px] text-gray-400 font-mono mt-1 truncate">Prod Document</div>
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
                <div className="flex justify-between items-center"><span className="text-sm text-gray-400">CRF ID</span><span className="text-sm font-mono font-bold text-white px-2 py-1 rounded-md bg-white/5">{requestId}</span></div>
                {req?.reqId && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-400">Request ID</span>
                    <span className="text-sm font-mono font-bold text-orange-400 px-2 py-1 rounded-md bg-white/5">{req.reqId}</span>
                  </div>
                )}
                <div className="flex justify-between items-center gap-4"><span className="text-sm text-gray-400 whitespace-nowrap">Requester</span><span className="text-sm text-white font-medium text-right break-words">{req?.userName || 'N/A'} <span className="text-xs text-gray-400 font-mono">({req?.userId || 'N/A'})</span></span></div>
                <div className="flex justify-between items-center"><span className="text-sm text-gray-400">Requirement Type</span><span className="text-sm text-white">{getRequirementTypeName(req?.requirementType)}</span></div>
                {req?.reasonForExpedite && <div className="flex justify-between items-center"><span className="text-sm text-gray-400">Expedite Reason</span><span className="text-sm text-amber-500 font-medium">{req.reasonForExpedite}</span></div>}
                <div className="flex justify-between items-center"><span className="text-sm text-gray-400">QA Status</span>
                  <span className="flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-emerald-400 bg-emerald-400/10 px-2 py-1 rounded-md border border-emerald-400/20">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg> {req?.qaStatus || 'N/A'}
                  </span>
                </div>
              </div>
            </div>

            {/* Previous Comments */}
            {(() => {
              const recommenderComment = (req as any)?.recommenderComment || (req as any)?.RecommenderComment;
              const verifierComment = (req as any)?.verifierComment;
              const revertComment = (req as any)?.revertComment;

              const comments: { label: string; by: string; text: string; color: string }[] = [];

              // For revert flows: show the requester's revert reason
              if (isRevert && revertComment) {
                comments.push({ label: 'Revert Reason', by: 'Requester', text: revertComment, color: 'red' });
              }

              // Step 2 (Verifier) sees recommender comment
              if (stepOrder === 2 && recommenderComment) {
                comments.push({ label: 'Recommender Comment', by: 'Recommender', text: recommenderComment, color: 'blue' });
              }

              // Step 3 (Approver) sees recommender + verifier comments
              if (stepOrder === 3) {
                if (recommenderComment) comments.push({ label: 'Recommender Comment', by: 'Recommender', text: recommenderComment, color: 'blue' });
                if (verifierComment) comments.push({ label: 'Verifier Comment', by: 'Verifier', text: verifierComment, color: 'purple' });
              }

              if (comments.length === 0) return null;

              const colorMap: Record<string, { border: string; bg: string; text: string; icon: string; dot: string }> = {
                red: { border: 'border-red-500/20', bg: 'bg-red-500/5', text: 'text-red-400', icon: 'text-red-400', dot: 'bg-red-500' },
                blue: { border: 'border-blue-500/20', bg: 'bg-blue-500/5', text: 'text-blue-400', icon: 'text-blue-400', dot: 'bg-blue-500' },
                purple: { border: 'border-purple-500/20', bg: 'bg-purple-500/5', text: 'text-purple-400', icon: 'text-purple-400', dot: 'bg-purple-500' },
              };

              return (
                <div className="glass-panel rounded-2xl p-6">
                  <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4 border-b border-white/10 pb-2 flex items-center gap-2">
                    <svg className="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"></path></svg>
                    Previous Comments
                  </h3>
                  <div className="space-y-3">
                    {comments.map((c, i) => {
                      const colors = colorMap[c.color] || colorMap.blue;
                      return (
                        <div key={i} className={`p-3 rounded-xl border ${colors.border} ${colors.bg}`}>
                          <div className="flex items-center gap-2 mb-1.5">
                            <span className={`w-1.5 h-1.5 rounded-full ${colors.dot}`}></span>
                            <span className={`text-[10px] font-bold uppercase tracking-widest ${colors.text}`}>{c.label}</span>
                          </div>
                          <p className={`text-sm leading-relaxed break-words whitespace-pre-wrap ${isLight ? 'text-gray-700' : 'text-gray-300'}`}>{c.text}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}

            {/* Action Card */}
            <div className="glass-panel rounded-2xl p-6 bg-gradient-to-b from-slate-800/80 to-slate-900/80 border border-emerald-500/20 shadow-[0_4px_30px_rgba(16,185,129,0.05)] text-center relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-bl-full -mr-8 -mt-8 pointer-events-none"></div>
              <h3 className="text-sm font-bold text-white mb-4 relative z-10">{actionLabel} Decision</h3>
              <div className="w-full bg-emerald-500/10 h-1.5 rounded-full mb-6 overflow-hidden relative z-10">
                <div className="bg-emerald-400 h-full w-full rounded-full animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.5)]"></div>
              </div>
              <button onClick={() => setShowApproveModal(true)} className="w-full mb-4 px-6 py-4 text-sm font-bold text-white bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 rounded-xl transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:shadow-[0_0_30px_rgba(16,185,129,0.5)] tracking-widest uppercase flex items-center justify-center gap-2 group relative z-10 border border-emerald-400/30">
                <svg className="w-5 h-5 group-hover:-translate-y-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                {actionLabel}
              </button>
              <button onClick={() => setShowRejectModal(true)} className="w-full px-6 py-3 text-xs font-bold text-red-400/80 hover:text-red-300 bg-red-500/5 border border-red-500/20 hover:border-red-500/50 hover:bg-red-500/20 rounded-xl transition-all tracking-widest uppercase relative z-10 flex items-center justify-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                Return
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Approve Modal */}
      {showApproveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => { if (!showSuccess) { setShowApproveModal(false); setComment(''); } }}></div>
          <div className="relative w-full max-w-xl glass-panel border border-emerald-500/30 rounded-2xl shadow-[0_0_60px_rgba(16,185,129,0.15)] overflow-visible" style={{ minHeight: '340px' }}>
            {!showSuccess ? (
              <div className="p-8 text-center flex flex-col items-center justify-center">
                <div className="relative w-16 h-16 mx-auto mb-6">
                  <div className="absolute inset-0 bg-emerald-500/30 rounded-full blur-xl animate-pulse"></div>
                  <div className="relative w-full h-full rounded-full bg-slate-800/80 flex items-center justify-center border border-emerald-500/30 shadow-[0_0_20px_rgba(16,185,129,0.3)] backdrop-blur-sm">
                    <svg className="w-8 h-8 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                  </div>
                </div>
                <h2 className="text-xl font-semibold text-white tracking-wide mb-2">Confirm {actionLabel}</h2>
                <p className="text-sm text-gray-400 mb-4">This will {actionLabel.toLowerCase()} <span className="text-white font-mono font-bold">{requestId}</span>.</p>
                <div className="w-full mb-6 text-left">
                  <label className="field-label">Comment (Optional)</label>
                  <textarea className="field-input resize-none h-20" placeholder="Add a comment..." maxLength={150} value={comment} onChange={e => setComment(e.target.value)}></textarea>
                  <div className="text-right text-[10px] text-gray-500 mt-1 font-mono">{comment.length}/150</div>
                </div>
                <div className="flex gap-4 w-full">
                  <button onClick={() => { setShowApproveModal(false); setComment(''); }} className="flex-1 px-6 py-3 text-sm text-gray-400 hover:text-white border border-white/10 hover:border-white/30 rounded-xl transition-all">Cancel</button>
                  <button onClick={handleApprove} disabled={processing} className="flex-1 px-6 py-3 rounded-xl text-sm font-bold bg-emerald-500 hover:bg-emerald-400 text-white shadow-[0_0_15px_rgba(16,185,129,0.4)] transition-all disabled:opacity-50">
                    {processing ? 'Processing...' : actionLabel}
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-8 flex flex-col items-center justify-center text-center bg-gradient-to-br from-emerald-900/60 to-slate-900/95 rounded-2xl h-full" style={{ minHeight: '340px' }}>
                <div className="w-20 h-20 rounded-full bg-emerald-500/20 flex items-center justify-center mb-6 border border-emerald-500/30 shadow-[0_0_30px_rgba(16,185,129,0.3)]">
                  <svg className="w-10 h-10 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                </div>
                <h2 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-emerald-300 to-white">Success!</h2>
                <p className="text-emerald-100/70 text-sm mt-3 font-medium">Request <span className="font-mono text-emerald-300 font-bold px-2 py-1 bg-emerald-500/10 rounded border border-emerald-500/20">{requestId}</span> has been {actionLabel.endsWith('y') ? actionLabel.slice(0, -1).toLowerCase() + 'ied' : actionLabel.endsWith('e') ? actionLabel.toLowerCase() + 'd' : actionLabel.toLowerCase() + 'ed'}.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => { if (!showSuccess) { setShowRejectModal(false); setRejectReason(''); } }}></div>
          <div className="relative w-full max-w-lg glass-panel border border-red-500/30 rounded-2xl shadow-[0_0_60px_rgba(239,68,68,0.15)]" style={{ minHeight: '340px' }}>
            {!showSuccess ? (
              <div className="p-8">
                <div className="relative w-16 h-16 mx-auto mb-6">
                  <div className="absolute inset-0 bg-red-500/30 rounded-full blur-xl animate-pulse"></div>
                  <div className="relative w-full h-full rounded-full bg-slate-800/80 flex items-center justify-center border border-red-500/30 shadow-[0_0_20px_rgba(239,68,68,0.3)] backdrop-blur-sm">
                    <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"></path></svg>
                  </div>
                </div>
                <h2 className="text-xl font-semibold text-white text-center tracking-wide mb-2">Return Request</h2>
                <p className="text-sm text-gray-400 text-center mb-6">Return <span className="text-white font-mono font-bold">{requestId}</span> to the requester.</p>
                <div className="mb-6">
                  <label className="field-label">Return Reason <span className="text-red-500">*</span></label>
                  <textarea className="field-input resize-none h-28" placeholder="Describe the reason for returning this request..." maxLength={150} value={rejectReason} onChange={e => setRejectReason(e.target.value)}></textarea>
                  <div className="text-right text-[10px] text-gray-500 mt-1 font-mono">{rejectReason.length}/150</div>
                </div>
                <div className="flex gap-4">
                  <button onClick={() => { setShowRejectModal(false); setRejectReason(''); }} className="flex-1 px-6 py-3 text-sm text-gray-400 hover:text-white border border-white/10 hover:border-white/30 rounded-xl transition-all">Cancel</button>
                  <button onClick={handleReject} disabled={processing || !rejectReason.trim()} className="flex-1 px-6 py-3 rounded-xl text-sm font-bold bg-red-500/80 hover:bg-red-500 text-white border border-red-500/50 transition-all disabled:opacity-50">
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
