import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { getRequirementTypeName } from "../../services/api";
import DocumentViewer from "../../components/DocumentViewer";

function fmtDate(d: string | null | undefined): string {
  if (!d) return 'N/A';
  try {
    const dt = new Date(d);
    if (isNaN(dt.getTime())) return d; // return as-is if not parseable
    const dd = String(dt.getDate()).padStart(2, '0');
    const mm = String(dt.getMonth() + 1).padStart(2, '0');
    const yyyy = dt.getFullYear();
    const hh = String(dt.getHours()).padStart(2, '0');
    const min = String(dt.getMinutes()).padStart(2, '0');
    return `${dd}-${mm}-${yyyy} ${hh}:${min}`;
  } catch { return d || 'N/A'; }
}

function getStatusLabel(r: any): string {
  const s = r.status;
  // Handle new backend string labels (e.g., "Released", "Revert Released")
  if (typeof s === 'string') {
    return r.statusText || s.toUpperCase();
  }
  // Legacy numeric status handling
  if (r.isRevert) return 'REVERT RELEASED';
  if (s === 0) return 'RETURNED';
  if (s === 1) return 'PENDING';
  if (s === 2) return 'RECOMMENDED';
  if (s === 3) return 'VERIFIED';
  if (s === 4) return 'APPROVED';
  if (s === 5) return 'RELEASED';
  if (s >= 6 && s <= 10) return 'REVERT IN PROGRESS';
  return r.statusText || `Status ${s}`;
}

function getStatusColor(status: string): string {
  if (status.includes('REVERT')) return 'text-blue-400 border-blue-500/30 bg-blue-500/10';
  if (status.includes('RELEASED')) return 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10';
  if (status.includes('RETURNED')) return 'text-red-400 border-red-500/30 bg-red-500/10';
  if (status.includes('APPROVED')) return 'text-blue-400 border-blue-500/30 bg-blue-500/10';
  if (status.includes('VERIFIED')) return 'text-cyan-400 border-cyan-500/30 bg-cyan-500/10';
  if (status.includes('RECOMMENDED')) return 'text-purple-400 border-purple-500/30 bg-purple-500/10';
  return 'text-gray-400 border-gray-500/30 bg-gray-500/10';
}

export default function ReportDetails() {
  const navigate = useNavigate();
  const location = useLocation();
  const report = location.state?.report;
  const isLight = document.documentElement.classList.contains('light');
  const [activeDoc, setActiveDoc] = useState<{ base64: string; type: string; name: string } | null>(null);

  if (!report) {
    return (
      <div className="min-h-screen bg-[#0F172A] flex items-center justify-center text-white">
        <div className="text-center">
          <h2 className="text-xl font-bold mb-4">No report data found</h2>
          <button onClick={() => navigate(-1)} className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded">Go Back</button>
        </div>
      </div>
    );
  }

  const requestId = report.idDisplay || report.reqId || report.req_id || report.crfId || report.ticketId || report.TicketId || "N/A";
  const isExp = report._type?.includes("EXP") || report.cabExp === "EXP" || (report.source || '').toUpperCase().includes('EXP');
  const themeColorClass = isExp ? (isLight ? "text-orange-600" : "text-orange-400") : "text-[#0084FF]";
  const themeGradient = isExp ? "from-orange-500/10" : "from-[#0084FF]/10";

  const statusLabel = getStatusLabel(report);
  const statusColor = getStatusColor(statusLabel);

  // Workflow: prioritize name over emp code, extract both for display
  const recommenderName = report.recommender || report.recommendedByName || null;
  const recommenderId = report.recommendedBy || null;
  const recommenderVal = recommenderName || recommenderId;
  const recommenderDate = report.recommenderDate || report.recommendedDate;
  const verifiedName = report.verified || report.approver1ByName || null;
  const verifiedId = report.approver1By || null;
  const verifiedVal = verifiedName || verifiedId;
  const verifiedDate = report.verifiedDate || report.approver1Date;
  const approvedName = report.approved || report.approver2ByName || null;
  const approvedId = report.approver2By || null;
  const approvedVal = approvedName || approvedId;
  const approvedDate = report.approvedDate || report.approver2Date;
  // Released: flat fields from GetReport/GetTicketReport, or nested from search-by-id
  const relDbName = report.dbReleasedByName && report.dbReleasedByName !== 'N/A' ? report.dbReleasedByName
    : report.dbReleased?.name && report.dbReleased.name !== 'N/A' ? report.dbReleased.name : null;
  const relDbId = report.dbReleasedBy || report.dbReleased?.id || null;
  const relAppName = report.appReleasedByName && report.appReleasedByName !== 'N/A' ? report.appReleasedByName
    : report.appReleased?.name && report.appReleased.name !== 'N/A' ? report.appReleased.name : null;
  const relAppId = report.appReleasedBy || report.appReleased?.id || null;
  const hasReleasedObj = relDbName || relAppName;
  // Fallback: nested object from GetCombinedReport or old flat releasedByName
  const relObj = report.released;
  const releasedValFlat = relObj?.app?.name || relObj?.db?.name || report.releasedByName || report.releasedBy;
  const releasedDate = report.releasedDate;
  const returnedVal = report.returnBy || report.returnByName;
  const returnedDate = report.returnDate;

  // Revert fields
  const hasRevert = report.revertRecommender || report.revertVerified || report.revertApproved;

  return (
    <div className={`h-screen w-full flex flex-col overflow-hidden ${isLight ? 'bg-[#e6eef5]' : 'bg-[#0F172A]'} text-slate-200 p-4 lg:p-6 font-sans theme-transition`}>
      <div className={`fixed top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] ${themeGradient} via-transparent to-transparent pointer-events-none z-0`} />

      <div className="relative z-10 flex-1 flex flex-col min-h-0">
        <header className="glass-header rounded-2xl mb-4 px-6 py-4 flex items-center justify-between shadow-lg shrink-0">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate(-1)} className="p-2 rounded-xl border border-white/5 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors group">
              <svg className="w-5 h-5 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
            </button>
            <div className="h-6 w-px bg-white/10" />
            <div>
              <h1 className="text-xl font-bold text-white tracking-wide">Report Detailed View</h1>
              <p className={`text-xs ${themeColorClass} font-mono mt-0.5 tracking-wider uppercase`}>{report.source || report._type || 'Request'} #{requestId}</p>
            </div>
          </div>
          <div className={`px-4 py-1.5 rounded-lg border ${statusColor} font-bold text-sm tracking-wider uppercase`}>
            {statusLabel}
          </div>
        </header>

        <div className="flex-1 overflow-y-auto pr-2 pb-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

            {/* Row 1: Overview (2/3) + Properties (1/3) — same row height */}
            <div className="lg:col-span-2 lg:order-1 glass-panel p-5 rounded-2xl border border-white/5">
              <h2 className="text-base font-bold text-white mb-4 flex items-center gap-2">
                <svg className={`w-5 h-5 ${themeColorClass}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                Overview
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Subject</label>
                  <div className={`p-3 rounded-xl ${isLight ? 'bg-black/5 border border-black/10 text-gray-700' : 'bg-black/20 border border-white/5 text-gray-300'} break-words whitespace-pre-wrap leading-relaxed`}>{report.subject || 'N/A'}</div>
                </div>
                {report.description && (
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Changes Incoperated</label>
                    <div className={`p-4 rounded-xl ${isLight ? 'bg-black/5 border border-black/10 text-gray-700' : 'bg-black/20 border border-white/5 text-gray-300'} break-words whitespace-pre-wrap leading-relaxed`}>{report.description}</div>
                  </div>
                )}
                {report.changesToBeMade && (
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Changes To Be Made</label>
                    <div className={`p-4 rounded-xl ${isLight ? 'bg-black/5 border border-black/10 text-gray-700' : 'bg-black/20 border border-white/5 text-gray-300'} break-words whitespace-pre-wrap leading-relaxed`}>
                      {report.changesToBeMade}
                    </div>
                  </div>
                )}
                {report.reasonForExpedite && (
                  <div>
                    <label className="block text-xs font-bold text-amber-500/80 uppercase tracking-widest mb-2">Notice / Reason</label>
                    <div className={`p-4 rounded-xl ${isLight ? 'bg-amber-50 border border-amber-200 text-amber-700' : 'bg-amber-500/10 border border-amber-500/20 text-amber-400'} break-words whitespace-pre-wrap leading-relaxed`}>
                      {report.reasonForExpedite}
                    </div>
                  </div>
                )}
                {report.returnComment && (
                  <div>
                    <label className="block text-xs font-bold text-red-500/80 uppercase tracking-widest mb-2">Return Comment</label>
                    <div className={`p-4 rounded-xl ${isLight ? 'bg-red-50 border border-red-200 text-red-700' : 'bg-red-500/10 border border-red-500/20 text-red-400'} break-words whitespace-pre-wrap leading-relaxed`}>
                      {report.returnComment}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Deployment Path — full width */}
            {(report.publishPath || report.commitId) && (
              <div className="lg:col-span-3 lg:order-3 glass-panel p-5 rounded-2xl border border-white/5">
                <h2 className="text-base font-bold text-white mb-4 flex items-center gap-2">
                  <svg className={`w-5 h-5 ${themeColorClass}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>
                  Deployment Path
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {report.publishPath && (
                    <div className="flex flex-col h-full">
                      <div className="flex justify-between items-start mb-1">
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest">Publish Path</label>
                        <button onClick={() => navigator.clipboard.writeText(report.publishPath!)} className="text-gray-500 hover:text-[#0084FF] transition-colors -mt-1" title="Copy Publish Path">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg>
                        </button>
                      </div>
                      <div className={`p-3 rounded-xl border flex-1 text-sm font-mono break-all whitespace-pre-wrap max-h-32 overflow-y-auto custom-scrollbar ${isLight ? 'bg-black/5 border-black/10 text-gray-700' : 'bg-black/30 border-white/5 text-gray-300'}`}>{report.publishPath}</div>
                    </div>
                  )}
                  {report.commitId && (
                    <div className="flex flex-col h-full">
                      <div className="flex justify-between items-start mb-1">
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest">Commit ID</label>
                        <button onClick={() => navigator.clipboard.writeText(report.commitId!)} className="text-gray-500 hover:text-emerald-400 transition-colors -mt-1" title="Copy Commit ID">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg>
                        </button>
                      </div>
                      <div className={`p-3 rounded-xl border flex-1 text-sm font-mono break-all whitespace-pre-wrap max-h-32 overflow-y-auto custom-scrollbar ${isLight ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-black/30 border-white/5 text-emerald-400'}`}>{report.commitId}</div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Attached Documents — full width */}
            {(report.uatSignoffDocument || report.productionReleaseDocument) && (
              <div className="lg:col-span-3 lg:order-4 glass-panel p-5 rounded-2xl border border-white/5">
                <h2 className="text-base font-bold text-white mb-4 flex items-center gap-2">
                  <svg className={`w-5 h-5 ${themeColorClass}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                  Attached Documents
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {report.uatSignoffDocument && (
                    <button onClick={() => setActiveDoc({ base64: report.uatSignoffDocument, type: '', name: 'UAT Signoff Document' })} className={`flex items-center w-full gap-4 p-4 rounded-xl border transition-colors text-left group ${isLight ? 'border-slate-200 hover:border-[#0084FF]/50 bg-slate-50 hover:bg-[#0084FF]/5' : 'border-white/10 hover:border-[#0084FF]/50 bg-white/5 hover:bg-[#0084FF]/10'}`}>
                      <div className="shrink-0 p-3 rounded-lg bg-[#0084FF]/20 text-[#0084FF]">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className={`text-sm font-bold group-hover:text-[#0084FF] transition-colors truncate ${isLight ? 'text-slate-800' : 'text-white'}`}>UAT Signoff</div>
                        <div className={`text-[10px] font-mono mt-1 truncate ${isLight ? 'text-slate-500' : 'text-gray-400'}`}>Click to view document</div>
                      </div>
                    </button>
                  )}
                  {report.productionReleaseDocument && (
                    <button onClick={() => setActiveDoc({ base64: report.productionReleaseDocument, type: '', name: 'Production Release Document' })} className={`flex items-center w-full gap-4 p-4 rounded-xl border transition-colors text-left group ${isLight ? 'border-slate-200 hover:border-emerald-500/50 bg-slate-50 hover:bg-emerald-500/5' : 'border-white/10 hover:border-emerald-500/50 bg-white/5 hover:bg-emerald-500/10'}`}>
                      <div className="shrink-0 p-3 rounded-lg bg-emerald-500/20 text-emerald-400">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className={`text-sm font-bold group-hover:text-emerald-400 transition-colors truncate ${isLight ? 'text-slate-800' : 'text-white'}`}>Production Release</div>
                        <div className={`text-[10px] font-mono mt-1 truncate ${isLight ? 'text-slate-500' : 'text-gray-400'}`}>Click to view document</div>
                      </div>
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Properties — same row as Overview */}
            <div className="lg:col-span-1 lg:order-2 glass-panel p-5 rounded-2xl border border-white/5">
              <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-3 border-b border-white/5 pb-2">Properties</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">User ID</span>
                  <span className="text-sm text-white font-mono">{report.userId || 'N/A'}</span>
                </div>
                {report.crfId && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-500">CRF ID</span>
                    <span className="text-sm text-white font-mono">{report.crfId}</span>
                  </div>
                )}
                {(report.ticketId || report.TicketId) && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-500">Ticket ID</span>
                    <span className="text-sm text-white font-mono">{report.ticketId || report.TicketId}</span>
                  </div>
                )}
                {(report.req_id || report.reqId) && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-500">Request ID</span>
                    <span className={`text-sm font-mono font-bold ${isExp ? 'text-orange-400' : 'text-[#0084FF]'}`}>{report.req_id || report.reqId}</span>
                  </div>
                )}
                {report.source && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-500">Source</span>
                    <span className={`text-sm font-bold ${themeColorClass}`}>{report.source}</span>
                  </div>
                )}
                {report.requirementType != null && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-500">Req Type</span>
                    <span className="text-sm text-white font-medium bg-white/10 px-2 py-0.5 rounded">{getRequirementTypeName(report.requirementType)}</span>
                  </div>
                )}
                {(report.projectName || report.dbType) && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-500">Project / DB</span>
                    <span className="text-sm text-white">{report.projectName || report.dbType}</span>
                  </div>
                )}
              </div>

              {/* Workflow — inline in Properties */}
              {(recommenderVal || verifiedVal || approvedVal) && (
                <>
                  <div className={`border-t ${isLight ? 'border-black/10' : 'border-white/5'} pt-3 mt-3`}>
                    <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-3">Workflow</h3>
                    <div className="space-y-3">
                      {recommenderVal && (
                        <div className="flex justify-between items-start">
                          <span className="text-xs text-gray-500">Recommended</span>
                          <div className="text-right">
                            <div className={`text-sm font-mono ${isLight ? 'text-gray-700' : 'text-gray-200'}`}>{recommenderName || recommenderId}</div>
                            {recommenderId && recommenderName && recommenderId !== recommenderName && <div className="text-[10px] text-gray-500 font-mono">{recommenderId}</div>}
                            {recommenderDate && <div className="text-[10px] text-gray-500 font-mono">{fmtDate(recommenderDate)}</div>}
                          </div>
                        </div>
                      )}
                      {verifiedVal && (
                        <div className="flex justify-between items-start">
                          <span className="text-xs text-gray-500">Verified</span>
                          <div className="text-right">
                            <div className={`text-sm font-mono ${isLight ? 'text-gray-700' : 'text-gray-200'}`}>{verifiedName || verifiedId}</div>
                            {verifiedId && verifiedName && verifiedId !== verifiedName && <div className="text-[10px] text-gray-500 font-mono">{verifiedId}</div>}
                            {verifiedDate && <div className="text-[10px] text-gray-500 font-mono">{fmtDate(verifiedDate)}</div>}
                          </div>
                        </div>
                      )}
                      {approvedVal && (
                        <div className="flex justify-between items-start">
                          <span className="text-xs text-gray-500">Approved</span>
                          <div className="text-right">
                            <div className={`text-sm font-mono ${isLight ? 'text-gray-700' : 'text-gray-200'}`}>{approvedName || approvedId}</div>
                            {approvedId && approvedName && approvedId !== approvedName && <div className="text-[10px] text-gray-500 font-mono">{approvedId}</div>}
                            {approvedDate && <div className="text-[10px] text-gray-500 font-mono">{fmtDate(approvedDate)}</div>}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}

              {/* Released / Returned — inline in Properties */}
              {(hasReleasedObj || releasedValFlat || returnedVal) && (
                <div className={`border-t pt-3 mt-3 ${returnedVal ? (isLight ? 'border-red-200' : 'border-red-500/30') : (isLight ? 'border-emerald-200' : 'border-emerald-500/30')}`}>
                  <h3 className={`text-sm font-bold uppercase tracking-widest mb-3 ${returnedVal ? (isLight ? 'text-red-600' : 'text-red-400') : (isLight ? 'text-emerald-600' : 'text-emerald-400')}`}>
                    {returnedVal ? 'Returned By' : 'Released By'}
                  </h3>
                  {returnedVal ? (
                    <div className="flex justify-between items-start">
                      <div className={`text-sm font-medium font-mono ${isLight ? 'text-gray-900' : 'text-white'}`}>{returnedVal}</div>
                      <div className={`text-[10px] font-mono ${isLight ? 'text-gray-500' : 'text-gray-400'}`}>{fmtDate(returnedDate)}</div>
                    </div>
                  ) : hasReleasedObj ? (
                    <div className="space-y-2">
                      {relAppName && (
                        <div className="flex justify-between items-start">
                          <span className={`text-xs ${isLight ? 'text-emerald-600' : 'text-emerald-400'}`}>App</span>
                          <div className="text-right">
                            <div className={`text-sm font-mono ${isLight ? 'text-gray-900' : 'text-white'}`}>{relAppName}</div>
                            {relAppId && <div className={`text-[10px] font-mono ${isLight ? 'text-gray-500' : 'text-gray-400'}`}>{relAppId}</div>}
                          </div>
                        </div>
                      )}
                      {relDbName && (
                        <div className="flex justify-between items-start">
                          <span className={`text-xs ${isLight ? 'text-blue-600' : 'text-blue-400'}`}>DB</span>
                          <div className="text-right">
                            <div className={`text-sm font-mono ${isLight ? 'text-gray-900' : 'text-white'}`}>{relDbName}</div>
                            {relDbId && <div className={`text-[10px] font-mono ${isLight ? 'text-gray-500' : 'text-gray-400'}`}>{relDbId}</div>}
                          </div>
                        </div>
                      )}
                      {releasedDate && <div className={`text-[10px] font-mono text-right ${isLight ? 'text-gray-500' : 'text-gray-400'}`}>{fmtDate(releasedDate)}</div>}
                    </div>
                  ) : (
                    <div className="flex justify-between items-start">
                      <div className={`text-sm font-medium font-mono ${isLight ? 'text-gray-900' : 'text-white'}`}>{releasedValFlat}</div>
                      <div className={`text-[10px] font-mono ${isLight ? 'text-gray-500' : 'text-gray-400'}`}>{fmtDate(releasedDate)}</div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Revert Workflow — full width */}
            {hasRevert && (
              <div className={`lg:col-span-3 lg:order-7 glass-panel p-5 rounded-2xl border ${isLight ? 'border-amber-200 bg-amber-50' : 'border-amber-500/20 bg-amber-500/5'}`}>
                <h3 className={`text-sm font-bold uppercase tracking-widest mb-3 border-b pb-2 ${isLight ? 'text-amber-600 border-amber-200' : 'text-amber-400 border-amber-500/20'}`}>Revert Workflow</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {report.revertRecommender && (
                    <div>
                      <span className="block text-xs font-bold text-gray-500 uppercase tracking-widest">Revert Recommended</span>
                      <div className={`text-sm mt-1 font-mono ${isLight ? 'text-gray-700' : 'text-gray-200'}`}>{report.revertRecommender}</div>
                      {report.revertRecommenderDate && <div className="text-[10px] text-gray-500 font-mono mt-0.5">{fmtDate(report.revertRecommenderDate)}</div>}
                    </div>
                  )}
                  {report.revertVerified && (
                    <div>
                      <span className="block text-xs font-bold text-gray-500 uppercase tracking-widest">Revert Verified</span>
                      <div className={`text-sm mt-1 font-mono ${isLight ? 'text-gray-700' : 'text-gray-200'}`}>{report.revertVerified}</div>
                      {report.revertVerifiedDate && <div className="text-[10px] text-gray-500 font-mono mt-0.5">{fmtDate(report.revertVerifiedDate)}</div>}
                    </div>
                  )}
                  {report.revertApproved && (
                    <div>
                      <span className="block text-xs font-bold text-gray-500 uppercase tracking-widest">Revert Approved</span>
                      <div className={`text-sm mt-1 font-mono ${isLight ? 'text-gray-700' : 'text-gray-200'}`}>{report.revertApproved}</div>
                      {report.revertApprovedDate && <div className="text-[10px] text-gray-500 font-mono mt-0.5">{fmtDate(report.revertApprovedDate)}</div>}
                    </div>
                  )}
                </div>
              </div>
            )}

          </div>
        </div>
      </div>

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
