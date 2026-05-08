import { Link } from "react-router-dom";
import { auth, getDashboardRoute } from "../../services/api";

const sampleSteps = [
  { name: "Request Submitted", isCompleted: true, userName: "John Doe", actionDate: "25-Mar-2026 10:00" },
  { name: "Recommended", isCompleted: true, userName: "Jane Smith", actionDate: "25-Mar-2026 11:30" },
  { name: "Verified", isCompleted: true, userName: "QA Team", actionDate: "25-Mar-2026 14:00" },
  { name: "Approved", isCompleted: true, userName: "Dept Head", actionDate: "25-Mar-2026 15:00" },
  { name: "Released", isCompleted: false, userName: null, actionDate: null },
];

export default function Flow() {
  const crfId = "992";
  const backRoute = getDashboardRoute(auth.getSession().stepOrder);

  return (
    <div className="h-screen w-full flex flex-col overflow-hidden text-slate-200 p-4">
      {/* Header */}
      <header className="glass-header rounded-2xl mb-6 px-6 py-4 flex items-center justify-between shrink-0 fade-in">
        <div className="flex items-center gap-4">
          <Link to={backRoute} className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors group">
            <svg className="w-5 h-5 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path></svg>
            <span className="text-xs font-bold tracking-widest uppercase">Back to Dashboard</span>
          </Link>
          <div className="h-6 w-px bg-white/10"></div>
          <h1 className="text-lg font-semibold text-white tracking-wide">Request Flow - CRF</h1>
        </div>
      </header>

      {/* Flow Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="glass-panel rounded-2xl p-8 fade-in-delay-1">
          <div className="flex items-start gap-8">
            {/* CRF ID Circle */}
            <div className="shrink-0">
              <div className="w-16 h-16 rounded-full bg-[#0084FF] flex items-center justify-center text-white font-bold text-lg shadow-[0_0_20px_rgba(0,132,255,0.4)]">
                {crfId}
              </div>
            </div>

            {/* Steps Row */}
            <div className="flex items-start gap-0 flex-1 overflow-x-auto pb-4">
              {sampleSteps.map((step, index) => (
                <div key={index} className="flex flex-col items-center relative" style={{ minWidth: '150px', marginRight: index < sampleSteps.length - 1 ? '20px' : '0' }}>
                  {/* Circle */}
                  <div className={`w-14 h-14 rounded-full flex items-center justify-center mb-3 transition-all ${step.isCompleted ? 'bg-[#0084FF] shadow-[0_0_15px_rgba(0,132,255,0.4)]' : 'bg-gray-600/50 border border-gray-500/30'}`}>
                    {step.isCompleted && (
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                    )}
                  </div>

                  {/* Step Name */}
                  <div className="text-sm font-bold text-white text-center mb-1">{step.name}</div>

                  {/* Step Details */}
                  <>
                    {step.userName && <div className="text-xs text-gray-400 text-center">{step.userName}</div>}
                    {step.actionDate && <div className="text-[10px] text-gray-500 font-mono text-center">{step.actionDate}</div>}
                  </>

                  {/* Connecting Line */}
                  {index < sampleSteps.length - 1 && (
                    <div className={`absolute top-7 left-[calc(50%+35px)] h-0.5 ${step.isCompleted ? 'bg-[#0084FF]' : 'bg-gray-600/50'}`} style={{ width: 'calc(100% - 20px)' }}></div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
