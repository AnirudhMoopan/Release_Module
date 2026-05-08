import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { cabRequest, expRequest, auth, getDashboardRoute } from "../../services/api";
import DragDropUpload from "../../components/DragDropUpload";
import type { CrfDetails } from "../../services/api";
import '../../assets/css/pages/release-details-common.css';

export default function CabDetails() {
  const navigate = useNavigate();
  const [requestType, setRequestType] = useState<"CRF" | "TICKET">("CRF");
  const [showForm, setShowForm] = useState(false);
  const [showSchema, setShowSchema] = useState(false);

  // Search fields
  const [crfId, setCrfId] = useState("");
  const [crfData, setCrfData] = useState<CrfDetails | null>(null);
  const [crfLoading, setCrfLoading] = useState(false);
  const [crfError, setCrfError] = useState("");

  // CAB fields
  const [cabReleaseDay, setCabReleaseDay] = useState("");
  const [cabReleaseDate, setCabReleaseDate] = useState("");

  // Form fields
  const [subject, setSubject] = useState("");
  const [changesToBeMade, setChangesToBeMade] = useState("");
  const [publishPath, setPublishPath] = useState("");
  const [commitId, setCommitId] = useState("");

  const [requirementType, setRequirementType] = useState("");
  const [dbType, setDbType] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");
  const [schemas, setSchemas] = useState<string[]>([]);
  const [uatFile, setUatFile] = useState<File | null>(null);
  const [prodFile, setProdFile] = useState<File | null>(null);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [submitMsg, setSubmitMsg] = useState("");
  const [infoPopup, setInfoPopup] = useState<string | null>(null);
  const [isLight, setIsLight] = useState(() => document.documentElement.classList.contains('light'));

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsLight(document.documentElement.classList.contains('light'));
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  const session = auth.getSession();
  const backRoute = getDashboardRoute(session.stepOrder);

  useEffect(() => { setShowForm(true); }, []);

  // Fetch schema list on mount
  useEffect(() => {
    (async () => {
      const res = await expRequest.getSchemas();
      if (res.success && res.data) {
        setSchemas(res.data.map((s: any) => s.schemaName));
      }
    })();
  }, []);

  // Compute CAB release day from date
  // Compute CAB release day from date if missing
  useEffect(() => {
    if (cabReleaseDate) {
      const parts = cabReleaseDate.split('/');
      if (parts.length === 3) {
        // Parse dd/mm/yyyy as yyyy-mm-dd
        const d = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
        const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
        setCabReleaseDay(days[d.getDay()] || "");
      } else {
        const d = new Date(cabReleaseDate);
        const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
        setCabReleaseDay(days[d.getDay()] || "");
      }
    } else {
      setCabReleaseDay("");
    }
  }, [cabReleaseDate]);

  // Reset all loaded data and form fields
  function clearForm() {
    setCrfId("");
    setCrfData(null);
    setCrfError("");
    setCrfLoading(false);
    setSubject("");
    setChangesToBeMade("");
    setPublishPath("");
    setCommitId("");
    setRequirementType("");
    setDbType("");
    setMobileNumber("");
    setShowSchema(false);
    setUatFile(null);
    setProdFile(null);
    setSubmitMsg("");
    setCabReleaseDay("");
    setCabReleaseDate("");
  }

  // Toggle request type and clear everything
  function toggleType(type: "CRF" | "TICKET") {
    if (type === requestType) return;
    setRequestType(type);
    clearForm();
  }

  const handleRequirementChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setRequirementType(val);
    // DB=1, DUAL=3 — both include database
    setShowSchema(val === '1' || val === '3');
  };

  // CRF/Ticket Lookup
  const handleCrfSearch = async () => {
    if (!crfId.trim()) return;
    setCrfLoading(true);
    setCrfError("");
    setCrfData(null);

    if (requestType === 'CRF') {
      const res = await cabRequest.getCabCrfDetails(parseInt(crfId));
      if (res.success && res.data) {
        const d = res.data as any;
        setCrfData({
          projectName: d.projectName || 'N/A',
          description: d.description || 'N/A',
          status: d.status || 'N/A',
          targetDate: d.targetDate || 'N/A',
          qaStatus: d.qaStatus || 'N/A',
        });
        // Auto-fill CAB release date from backend
        if (d.nextReleaseDay) setCabReleaseDay(d.nextReleaseDay);
        if (d.nextReleaseDate) {
          setCabReleaseDate(d.nextReleaseDate.replace(/-/g, '/'));
        }
      } else {
        setInfoPopup(res.message || "CRF not found");
      }
    } else {
      // TICKET lookup
      const res = await cabRequest.getCabTicketDetails(parseInt(crfId));
      if (res.success && res.data) {
        const d = res.data as any;
        setCrfData({
          projectName: d.descIssue || 'N/A',
          description: d.problemDesc || 'N/A',
          status: d.status || 'N/A',
          targetDate: d.createdDate || 'N/A',
          qaStatus: 'N/A',
        });
        // Auto-fill CAB release date from backend
        if (d.nextReleaseDay) setCabReleaseDay(d.nextReleaseDay);
        if (d.nextReleaseDate) {
          setCabReleaseDate(d.nextReleaseDate.replace(/-/g, '/'));
        }
      } else {
        setInfoPopup(res.message || "Ticket not found");
      }
    }
    setCrfLoading(false);
  };

  // Form Submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!crfId || !subject || !changesToBeMade || !requirementType) {
      setSubmitMsg("Please fill all required fields");
      setSubmitStatus('error');
      return;
    }
    if (mobileNumber.length !== 10) {
      setSubmitMsg("Mobile number must be exactly 10 digits");
      setSubmitStatus('error');
      return;
    }
    if (!uatFile || !prodFile) {
      setSubmitMsg("Both documents are required");
      setSubmitStatus('error');
      return;
    }

    setSubmitStatus('submitting');
    setSubmitMsg("");

    const formData = new FormData();
    formData.append("UserId", session.empCode);
    formData.append("Subject", subject);
    formData.append("ChangesToBeMade", changesToBeMade);
    formData.append("PublishPath", publishPath);
    formData.append("CommitId", commitId);
    formData.append("ReasonForExpedite", "");
    formData.append("RequirementType", requirementType);
    formData.append("DbType", dbType);
    formData.append("MobileNumber", mobileNumber || "0");
    formData.append("UatSignoffDocument", uatFile);
    formData.append("ProdReleaseDoc", prodFile);

    let res;
    if (requestType === 'TICKET') {
      formData.append("TicketId", crfId);
      formData.append("CabExp", "CAB");
      res = await cabRequest.createTicketRequest(formData);
    } else {
      formData.append("CrfId", crfId);
      res = await cabRequest.createCabCrfRequest(formData);
    }

    if (res.success) {
      setSubmitStatus('success');
      setSubmitMsg("CAB Request submitted successfully!");
      setTimeout(() => navigate("/Dashboard/Index"), 3000);
    } else {
      setSubmitStatus('error');
      const errorMsg = res.data ? `${res.message}: ${String(res.data)}` : res.message;
      setSubmitMsg(errorMsg || "Failed to submit request");
    }
  };

  return (
    <>
    <div className="h-screen w-full flex flex-col overflow-hidden text-slate-200 p-4">

      {/* Top Header Bar */}
      <header className="glass-header rounded-2xl mb-4 px-6 py-4 flex items-center justify-between shrink-0 fade-in">
        <div className="flex items-center gap-4">
          <Link to={backRoute} className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors group">
            <svg className="w-5 h-5 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path>
            </svg>
            <span className="text-xs font-bold tracking-widest uppercase">Back to Dashboard</span>
          </Link>
          <div className="h-6 w-px bg-white/10"></div>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#0084FF]/20 flex items-center justify-center">
              <svg className="w-4 h-4 text-[#0084FF]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
              </svg>
            </div>
            <h1 className="text-lg font-semibold text-white tracking-wide">Add Request Note</h1>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-xs text-gray-500 font-mono">
            <span className="w-2 h-2 rounded-full bg-[#0084FF] animate-pulse"></span>
            CAB REQUEST
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto pr-1">
        <div className="glass-panel rounded-2xl p-8 fade-in-delay-1">
          <form onSubmit={handleSubmit}>
            {/* Request Type Toggle + CAB Info Row */}
            <div className="grid grid-cols-1 md:grid-cols-[auto_1fr_1fr_auto] gap-6 mb-2 items-end">
              <div>
                <label className="field-label" style={{ marginBottom: '10px' }}>Request Type</label>
                <div className="type-toggle" id="typeToggle">
                  <div className={`type-toggle-slider ${requestType === 'TICKET' ? 'right' : ''}`} id="toggleSlider"></div>
                  <button type="button" className={`type-toggle-btn ${requestType === 'CRF' ? 'active' : ''}`} onClick={() => toggleType('CRF')}>
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                    CRF ID
                  </button>
                  <button type="button" className={`type-toggle-btn ${requestType === 'TICKET' ? 'active' : ''}`} onClick={() => toggleType('TICKET')}>
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z"></path></svg>
                    TICKET ID
                  </button>
                </div>
              </div>
              
              <div>
                <label className="field-label">CAB Release Day</label>
                <input readOnly className="field-input-highlight" value={cabReleaseDay} />
              </div>
              
              <div>
                <label className="field-label">CAB Release Date</label>
                <input readOnly type="text" className="field-input-highlight" value={cabReleaseDate ? cabReleaseDate.replace(/-/g, '/') : ''} />
              </div>

              <div>
                <button 
                  type="button" 
                  onClick={clearForm}
                  className="px-4 py-2 w-full md:w-auto flex items-center justify-center gap-2 rounded-xl text-xs font-bold tracking-widest uppercase transition-all bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white border border-red-500/20 hover:border-red-500 cursor-pointer"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
                  Reset
                </button>
              </div>
            </div>

            {/* UNIFIED FORM */}
            {showForm && (
              <div id="unified-form">
                <div className="section-divider">
                  <div className="line"></div>
                  <span className="label">{requestType === 'CRF' ? 'CRF Information' : 'Ticket Information'}</span>
                  <div className="line"></div>
                </div>

                {/* Row: CRF ID, Project Name */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-5">
                  <div>
                    <label className="field-label">{requestType === 'CRF' ? 'CRF ID' : 'Ticket ID'}</label>
                    <div className="search-group">
                      <input type="text" className="field-input" placeholder={`Search ${requestType} ID`} value={crfId} onChange={(e) => setCrfId(e.target.value)} />
                      <button type="button" className="search-btn" onClick={handleCrfSearch} disabled={crfLoading}>
                        {crfLoading ? (
                          <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>
                        ) : (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                        )}
                      </button>
                    </div>
                    {crfError && <p className="text-xs text-red-400 mt-1">{crfError}</p>}
                  </div>
                  <div>
                    <label className="field-label">Project Name</label>
                    <div className="field-input-readonly">{crfData?.projectName || '\u00A0'}</div>
                  </div>
                </div>

                {/* Row: CRF Status, Target Date, QA Status */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-5">
                  <div>
                    <label className="field-label">{requestType === 'CRF' ? 'CRF Status' : 'Ticket Status'}</label>
                    <div className="field-input-readonly">{crfData?.status || '\u00A0'}</div>
                  </div>
                  <div>
                    <label className="field-label">Target Date</label>
                    <div className="field-input-readonly">{crfData?.targetDate ? crfData.targetDate.replace(/-/g, '/') : '\u00A0'}</div>
                  </div>
                  <div>
                    <label className="field-label">QA Status</label>
                    <div className="field-input-readonly">{crfData?.qaStatus || '\u00A0'}</div>
                  </div>
                </div>

                {/* Row: CRF Description */}
                <div className="mb-5">
                  <label className="field-label">{requestType === 'CRF' ? 'CRF Description' : 'Ticket Description'}</label>
                  <div className="field-input-readonly whitespace-pre-wrap min-h-[60px] leading-relaxed">{crfData?.description || '\u00A0'}</div>
                </div>

                <div className="section-divider">
                  <div className="line"></div>
                  <span className="label">Details</span>
                  <div className="line"></div>
                </div>

                {/* Row: Subject, Changes to be Made */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-5">
                  <div>
                    <label className="field-label">Subject *</label>
                    <textarea className="field-input w-full" maxLength={500} rows={2} placeholder="maximum 500 characters" style={{ resize: 'vertical', minHeight: '60px', maxHeight: '150px' }} value={subject} onChange={e => setSubject(e.target.value)} required></textarea>
                  </div>
                  <div>
                    <label className="field-label">Changes to be Made *</label>
                    <textarea className="field-input w-full" maxLength={500} rows={2} placeholder="maximum 500 characters" style={{ resize: 'vertical', minHeight: '60px', maxHeight: '150px' }} value={changesToBeMade} onChange={e => setChangesToBeMade(e.target.value)} required></textarea>
                  </div>
                </div>

                {/* Row: Publish Path, Commit ID */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-5">
                  <div>
                    <label className="field-label">Publish Path</label>
                    <textarea className="field-input w-full font-mono text-sm" maxLength={500} rows={2} placeholder="maximum 500 characters" style={{ resize: 'vertical', minHeight: '60px', maxHeight: '150px' }} value={publishPath} onChange={e => setPublishPath(e.target.value)}></textarea>
                  </div>
                  <div>
                    <label className="field-label">Commit ID</label>
                    <textarea className="field-input w-full font-mono text-sm" maxLength={500} rows={2} placeholder="maximum 500 characters" style={{ resize: 'vertical', minHeight: '60px', maxHeight: '150px' }} value={commitId} onChange={e => setCommitId(e.target.value)}></textarea>
                  </div>
                </div>

                {/* Row: Requirement Type, Mobile Number */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-5">
                  <div>
                    <label className="field-label">Requirement Type *</label>
                    <div className="select-wrapper">
                      <select className="field-select" onChange={handleRequirementChange} value={requirementType} required>
                        <option value="">-- Select --</option>
                        <option value="2">Application</option>
                        <option value="3">Application + Database</option>
                        <option value="1">DataBase</option>
                      </select>
                      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                    </div>
                    {showSchema && (
                      <div style={{ marginTop: '12px' }}>
                        <label className="field-label">Schema</label>
                        <div className="select-wrapper">
                          <select className="field-select" value={dbType} onChange={e => setDbType(e.target.value)}>
                            <option value="">-- Select Schema --</option>
                            {schemas.map(s => (
                              <option key={s} value={s}>{s}</option>
                            ))}
                          </select>
                          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                        </div>
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="field-label">Mobile Number *</label>
                    <input type="tel" className="field-input" maxLength={10} placeholder="10 digit mobile number" value={mobileNumber} onChange={e => { const v = e.target.value.replace(/[^0-9]/g, ''); setMobileNumber(v); }} required />
                  </div>
                </div>

                <div className="section-divider">
                  <div className="line"></div>
                  <span className="label">Documents</span>
                  <div className="line"></div>
                </div>

                {/* Row: Document uploads */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-5">
                  <DragDropUpload
                    id="cabUatDoc"
                    label="UAT Signoff Document *"
                    accept=".jpg,.jpeg,.pdf,.png"
                    file={uatFile}
                    onFileSelect={setUatFile}
                  />
                  <DragDropUpload
                    id="cabProdDoc"
                    label="Production Release Document *"
                    accept=".jpg,.jpeg,.pdf,.png"
                    file={prodFile}
                    onFileSelect={setProdFile}
                  />
                </div>
              </div>
            )}

            {/* Footer Buttons */}
            {showForm && (
              <div id="form-footer" className="flex items-center justify-end gap-4 mt-8 pt-6 border-t border-white/5">
                <Link to={backRoute} className="px-8 py-3 text-sm font-bold text-red-400 bg-red-500/10 border border-red-500/20 hover:bg-red-500 hover:text-white rounded-xl transition-all tracking-widest uppercase">
                  Close
                </Link>
                <button type="submit" disabled={submitStatus === 'submitting'} className="px-10 py-3 text-sm font-bold text-white bg-gradient-to-r from-emerald-500 to-emerald-700 hover:from-emerald-400 hover:to-emerald-600 rounded-xl transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:shadow-[0_0_30px_rgba(16,185,129,0.5)] tracking-widest uppercase disabled:opacity-50">
                  {submitStatus === 'submitting' ? 'Submitting...' : 'Send'}
                </button>
              </div>
            )}
          </form>
        </div>
      </div>

      {/* Submission Overlay Modal */}
      {(submitStatus !== 'idle') && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm transition-opacity duration-300 theme-transition">
          <div className={`rounded-3xl p-10 flex flex-col items-center justify-center text-center shadow-2xl max-w-sm w-full mx-4 transform transition-all duration-300 scale-100 opacity-100 ${isLight ? 'bg-white border border-gray-200' : 'glass-panel'}`}>
            
            {submitStatus === 'submitting' && (
              <div className="flex flex-col items-center animate-in fade-in zoom-in duration-300">
                <div className="relative w-20 h-20 flex items-center justify-center mb-6">
                  <div className="absolute inset-0 rounded-full border-4 border-[#0084FF]/20"></div>
                  <div className="absolute inset-0 rounded-full border-4 border-[#0084FF] border-t-transparent animate-spin"></div>
                  <svg className="w-8 h-8 text-[#0084FF] animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path></svg>
                </div>
                <h3 className="text-xl font-bold text-white tracking-wide">Sending Request</h3>
                <p className="text-sm text-gray-400 mt-2">Connecting to secure gateway...</p>
              </div>
            )}
            
            {submitStatus === 'success' && (
              <div className="flex flex-col items-center animate-in fade-in zoom-in duration-500">
                <div className="relative w-24 h-24 rounded-full bg-emerald-500/20 flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(16,185,129,0.3)]">
                  <div className="absolute inset-0 rounded-full border-4 border-emerald-500/30 animate-[ping_1.5s_cubic-bezier(0,0,0.2,1)_infinite]"></div>
                  <svg className="w-12 h-12 text-emerald-400 drop-shadow-[0_0_10px_rgba(52,211,153,0.8)] animate-[bounce_1s_ease-out]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path>
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-emerald-400 tracking-wide">Success!</h3>
                <p className="text-sm text-gray-300 mt-3">{submitMsg || "Request handled successfully!"}</p>
                <div className="flex items-center gap-2 mt-6 px-4 py-2 bg-black/30 rounded-full">
                  <svg className="w-4 h-4 text-emerald-500 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>
                  <p className="text-xs text-gray-400 font-mono tracking-wider">Redirecting to Dashboard...</p>
                </div>
              </div>
            )}

            {submitStatus === 'error' && (
              <div className="flex flex-col items-center animate-in fade-in zoom-in duration-300">
                <div className="w-20 h-20 rounded-full bg-red-500/20 border-2 border-red-500/30 flex items-center justify-center mb-6 text-red-500 shadow-[0_0_20px_rgba(239,68,68,0.2)]">
                  <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12"></path>
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-red-400 tracking-wide">Action Failed</h3>
                <p className="text-sm text-gray-300 mt-3">{submitMsg}</p>
                <button 
                  onClick={() => setSubmitStatus('idle')} 
                  className="mt-8 px-8 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-all font-bold tracking-widest text-xs uppercase"
                >
                  Close & Try Again
                </button>
              </div>
            )}
            
          </div>
        </div>
      )}
    </div>

      {/* Info Popup Modal */}
      {infoPopup && (
        <div className={`fixed inset-0 z-[200] flex items-center justify-center backdrop-blur-sm ${isLight ? 'bg-black/40' : 'bg-black/60'}`}>
          <div className={`rounded-2xl p-8 flex flex-col items-center text-center max-w-sm w-full mx-4 ${isLight ? 'bg-white shadow-[0_20px_60px_rgba(0,0,0,0.3)] border border-gray-200' : 'bg-[#0f172a] shadow-[0_20px_60px_rgba(0,0,0,0.5)] border border-white/10'}`}>
            <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-5 ${isLight ? 'bg-red-50 border border-red-200' : 'bg-red-500/20'}`}>
              <svg className={`w-8 h-8 ${isLight ? 'text-red-500' : 'text-red-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"></path></svg>
            </div>
            <h3 className={`text-lg font-bold tracking-wide mb-3 ${isLight ? 'text-gray-900' : 'text-white'}`}>Notice</h3>
            
            <div className="flex flex-col items-center gap-1 mb-2">
              {infoPopup.includes('Status:') ? (
                <>
                  <p className={`text-[15px] font-bold text-center ${isLight ? 'text-red-600' : 'text-red-400'}`}>{infoPopup.split('Status:')[0].trim().replace(/\.$/, '')}</p>
                  <p className={`text-[11px] font-mono uppercase tracking-wider px-3 py-1.5 rounded-lg mt-2 inline-block ${isLight ? 'bg-gray-100 text-gray-600 border border-gray-200' : 'bg-white/5 text-gray-400 border border-white/10'}`}>
                    Status: {infoPopup.split('Status:')[1].trim()}
                  </p>
                </>
              ) : (
                <p className={`text-[15px] font-bold text-center ${isLight ? 'text-red-600' : 'text-red-400'}`}>{infoPopup}</p>
              )}
            </div>

            <button
              onClick={() => setInfoPopup(null)}
              className="mt-6 px-10 py-2.5 rounded-xl text-sm font-bold tracking-widest uppercase transition-all cursor-pointer bg-red-500 hover:bg-red-600 text-white shadow-lg border border-red-600/50"
            >
              OK
            </button>
          </div>
        </div>
      )}
    </>
  );
}
