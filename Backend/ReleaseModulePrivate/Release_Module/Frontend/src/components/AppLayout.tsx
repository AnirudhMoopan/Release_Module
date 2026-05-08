import { useState, useEffect } from "react";
import { Outlet, Link, useNavigate } from "react-router-dom";
import { auth } from "../services/api";
import { motion, AnimatePresence } from "framer-motion";
import HeaderSearch from "./HeaderSearch";
import Signature from "./Signature";

export default function AppLayout() {
  const navigate = useNavigate();
  const [isLight, setIsLight] = useState(() => document.documentElement.classList.contains('light'));
  const [showModal, setShowModal] = useState(false);
  const [clickCount, setClickCount] = useState(0);
  const [isSignatureActive, setIsSignatureActive] = useState(false);
  const session = auth.getSession();

  useEffect(() => {
    if (clickCount > 0 && clickCount < 7) {
      const timer = setTimeout(() => setClickCount(0), 400); // 400ms reset
      return () => clearTimeout(timer);
    } else if (clickCount >= 7) {
      setIsSignatureActive(true);
      setClickCount(0);
    }
  }, [clickCount]);

  const toggleTheme = () => {
    const root = document.documentElement;
    const isNowLight = root.classList.toggle('light');
    sessionStorage.setItem('app-theme', isNowLight ? 'light' : 'dark');
    setIsLight(isNowLight);
  };

  useEffect(() => {
    const t = sessionStorage.getItem('app-theme') || 'dark';
    if (t === 'light') {
      document.documentElement.classList.add('light');
      setIsLight(true);
    } else {
      document.documentElement.classList.remove('light');
      setIsLight(false);
    }
  }, []);

  const navigateToDetails = (type: string) => {
    setShowModal(false);
    if (type === 'cab') navigate('/Release/CabDetails');
    else navigate('/Release/ExpDetails');
  };

  return (
    <div className="h-screen w-full flex overflow-hidden text-slate-200 theme-transition">
      
      {/* Floating Left Sidebar */}
      <aside className="flex-none w-72 p-4 flex flex-col h-full z-20">
        <div className="glass-panel flex-1 rounded-2xl flex flex-col overflow-hidden relative">
          
          {/* Branding Area */}
          <div className="p-6 border-b border-white/5 flex items-center gap-4">
            <div className="relative group cursor-pointer">
              <div className="h-12 w-12 rounded-full bg-gradient-to-br from-[#0084FF] to-purple-600 flex items-center justify-center p-2">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/></svg>
              </div>
              <div className="absolute inset-0 rounded-full border border-[#0084FF] opacity-0 group-hover:opacity-100 group-hover:animate-ping"></div>
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-bold text-white tracking-widest uppercase">Release</span>
              <span className="text-xs font-medium tracking-[0.2em] text-[#0084FF] uppercase">Release Module</span>
            </div>
          </div>

          {/* Navigation Menu */}
          <div className="flex-1 overflow-y-auto p-4 space-y-6">
            
            {/* Main Action Button */}
            <div>
              <button onClick={() => setShowModal(true)} className="w-full flex items-center justify-center gap-3 px-6 py-4 btn-cyber-emerald rounded-xl font-bold text-sm tracking-wider">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path>
                </svg>
                <span>NEW REQUEST NOTE</span>
              </button>
            </div>

            {/* HUD Style Separator */}
            <div className="flex items-center gap-2 opacity-30 mt-8 mb-4">
              <div className="h-px bg-white flex-1"></div>
              <span className="text-[10px] uppercase tracking-widest text-[#0084FF] font-mono">Reports</span>
              <div className="h-px bg-white flex-1"></div>
            </div>

            {/* Reports Group */}
            <div className="space-y-3">
              {/* EXP Report Button */}
              <Link to="/Reports/ExpReport" className="group rounded-xl overflow-hidden glass-panel border flex items-center justify-between px-4 py-4 hover:bg-orange-500/10 border-white/5 hover:border-orange-500/30 text-gray-200 transition-all focus:outline-none relative">
                <div className="absolute inset-0 bg-gradient-to-r from-orange-500/0 via-orange-500/0 to-orange-500/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <div className="flex items-center gap-3 relative z-10">
                  <div className="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center border border-orange-500/20 group-hover:bg-orange-500/20 transition-colors">
                    <svg className="w-4 h-4 text-orange-500 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                    </svg>
                  </div>
                  <div>
                    <span className="block tracking-wide text-sm font-semibold group-hover:text-orange-400 transition-colors">EXP REPORTS</span>
                    <span className="block text-[10px] text-gray-500 font-mono mt-0.5">Expedite release tracking</span>
                  </div>
                </div>
                <svg className="w-5 h-5 text-gray-600 group-hover:text-orange-400 transform group-hover:translate-x-1 transition-all relative z-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path>
                </svg>
              </Link>

              {/* CAB Report Button */}
              <Link to="/Reports/CabReport" className="group rounded-xl overflow-hidden glass-panel border flex items-center justify-between px-4 py-4 hover:bg-[#0084FF]/10 border-white/5 hover:border-[#0084FF]/30 text-gray-200 transition-all focus:outline-none relative">
                <div className="absolute inset-0 bg-gradient-to-r from-[#0084FF]/0 via-[#0084FF]/0 to-[#0084FF]/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <div className="flex items-center gap-3 relative z-10">
                  <div className="w-8 h-8 rounded-lg bg-[#0084FF]/10 flex items-center justify-center border border-[#0084FF]/20 group-hover:bg-[#0084FF]/20 transition-colors">
                    <svg className="w-4 h-4 text-[#0084FF] group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                    </svg>
                  </div>
                  <div>
                    <span className="block tracking-wide text-sm font-semibold group-hover:text-[#0084FF] transition-colors">CAB REPORTS</span>
                    <span className="block text-[10px] text-gray-500 font-mono mt-0.5">Change Advisory Board tracking</span>
                  </div>
                </div>
                <svg className="w-5 h-5 text-gray-600 group-hover:text-[#0084FF] transform group-hover:translate-x-1 transition-all relative z-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path>
                </svg>
              </Link>
            </div>
          </div>
        </div>
      </aside>
      {/* Main Workspace Area */}
      <main className="flex-1 flex flex-col h-full relative z-10 pl-0 p-4">
        
        {/* Top Glass Header */}
        <header className="glass-header rounded-2xl mb-4 px-6 py-4 flex items-center justify-between shrink-0 relative z-50">
          {/* Profile / User Details */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <div 
                onClick={() => setClickCount(c => c + 1)}
                className="w-10 h-10 rounded-full bg-gradient-to-br from-[#0084FF] to-purple-600 flex items-center justify-center text-white font-bold shadow-lg cursor-pointer select-none"
              >
                {session.empName?.substring(0, 2).toUpperCase() || 'U'}
              </div>
              <div>
                <p className="text-sm font-medium text-white">{session.empName || 'User'}</p>
                <p className="text-xs text-gray-500">{session.empCode || 'N/A'}</p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            {/* Header Search */}
            <HeaderSearch />
            {/* Theme Toggle Button */}
            <button onClick={toggleTheme} aria-label="Toggle theme" title="Toggle Light/Dark Mode" className="relative p-2 text-gray-400 hover:text-[#0084FF] transition-colors bg-white/5 hover:bg-[#0084FF]/10 rounded-full border border-white/5">
              {!isLight ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"></path>
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"></path>
                </svg>
              )}
            </button>
            {/* Sign Out Button */}
            <button onClick={() => { auth.logout(); navigate('/Login'); }} className="flex items-center gap-2 px-4 py-2 bg-red-500/10 text-red-400 border border-red-500/20 rounded-xl hover:bg-red-500 hover:text-white transition-all group">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path>
              </svg>
              <span className="text-xs font-bold tracking-widest uppercase">Sign Out</span>
            </button>
          </div>
        </header>

        {/* Content Outlet */}
        <div className="flex-1 overflow-y-auto pr-2 pb-2">
          <Outlet />
        </div>
      </main>

      {/* ================ ADD REQUEST NOTE MODAL ================ */}
      <AnimatePresence>
      {showModal && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          id="requestNoteModal" 
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/85 backdrop-blur-sm" onClick={() => setShowModal(false)}></div>
          
          {/* Modal Panel */}
          <motion.div 
            initial={{ scale: 0.95, y: 20, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.95, y: 20, opacity: 0 }}
            transition={{ type: "spring", duration: 0.4 }}
            className="relative w-full max-w-3xl mx-auto glass-panel border border-white/10 rounded-2xl shadow-[0_0_60px_rgba(0,132,255,0.15)] overflow-hidden"
          >
            
            {/* Modal Header */}
            <div className="flex items-center justify-between px-8 py-5 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#0084FF]/20 flex items-center justify-center">
                  <svg className="w-4 h-4 text-[#0084FF]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path>
                  </svg>
                </div>
                <h2 className="text-lg font-semibold text-white tracking-wide">Add Request Note</h2>
              </div>
              <button onClick={() => setShowModal(false)} className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-400/10 rounded-xl transition-all">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* CAB Card */}
                <button onClick={() => navigateToDetails('cab')} className="group relative p-8 glass-panel border border-white/5 hover:border-[#0084FF]/40 rounded-2xl transition-all duration-700 ease-[cubic-bezier(0.25,1,0.5,1)] hover:shadow-[0_15px_50px_rgba(0,132,255,0.15)] hover:-translate-y-2 overflow-hidden text-left bg-black/20">
                  <div className="absolute inset-0 bg-gradient-to-br from-[#0084FF]/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 ease-in-out"></div>
                  
                  <div className="w-14 h-14 rounded-xl bg-[#0084FF]/10 flex items-center justify-center mb-6 group-hover:scale-110 group-hover:-rotate-3 transition-transform duration-700 ease-[cubic-bezier(0.34,1.56,0.64,1)] border border-[#0084FF]/20 shadow-[0_0_15px_rgba(0,132,255,0.1)]">
                    <svg className="w-7 h-7 text-[#0084FF]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                    </svg>
                  </div>
                  
                  <h3 className="text-xl font-light text-white tracking-wider mb-2 uppercase relative z-10 transition-transform duration-700 ease-[cubic-bezier(0.25,1,0.5,1)] group-hover:translate-x-1">CAB Request</h3>
                  <p className="text-xs text-gray-400 font-mono leading-relaxed opacity-60 group-hover:opacity-100 transition-all duration-700 ease-[cubic-bezier(0.25,1,0.5,1)] relative z-10">Schedule and track standard releases through the Change Advisory Board flow.</p>
                  
                  <div className="mt-6 flex items-center gap-2 text-[#0084FF] text-[10px] font-mono tracking-widest uppercase opacity-0 group-hover:opacity-100 transform translate-y-3 group-hover:translate-y-0 transition-all duration-[1200ms] ease-in-out delay-75">
                    <span>Initiate CAB Release</span>
                    <svg className="w-3 h-3 transition-transform duration-[1200ms] ease-in-out group-hover:translate-x-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 8l4 4m0 0l-4 4m4-4H3"></path></svg>
                  </div>
                </button>

                {/* Expedite Card */}
                <button onClick={() => navigateToDetails('exp')} className="group relative p-8 glass-panel border border-white/5 hover:border-amber-500/40 rounded-2xl transition-all duration-700 ease-[cubic-bezier(0.25,1,0.5,1)] hover:shadow-[0_15px_50px_rgba(245,158,11,0.15)] hover:-translate-y-2 overflow-hidden text-left bg-black/20">
                  <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 ease-in-out"></div>
                  
                  <div className="w-14 h-14 rounded-xl bg-amber-500/10 flex items-center justify-center mb-6 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-700 ease-[cubic-bezier(0.34,1.56,0.64,1)] border border-amber-500/20 shadow-[0_0_15px_rgba(245,158,11,0.1)]">
                    <svg className="w-7 h-7 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
                    </svg>
                  </div>
                  
                  <h3 className="text-xl font-light text-white tracking-wider mb-2 uppercase relative z-10 transition-transform duration-700 ease-[cubic-bezier(0.25,1,0.5,1)] group-hover:translate-x-1">Expedite Request</h3>
                  <p className="text-xs text-gray-400 font-mono leading-relaxed opacity-60 group-hover:opacity-100 transition-all duration-700 ease-[cubic-bezier(0.25,1,0.5,1)] relative z-10">Emergency release protocol for critical hotfixes and immediate production deployments.</p>
                  
                  <div className="mt-6 flex items-center gap-2 text-amber-500 text-[10px] font-mono tracking-widest uppercase opacity-0 group-hover:opacity-100 transform translate-y-3 group-hover:translate-y-0 transition-all duration-[1200ms] ease-in-out delay-75">
                    <span>Initialize Expedite Release</span>
                    <svg className="w-3 h-3 transition-transform duration-[1200ms] ease-in-out group-hover:translate-x-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 8l4 4m0 0l-4 4m4-4H3"></path></svg>
                  </div>
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
      </AnimatePresence>

      {/* Signature Easter Egg */}
      <Signature isActive={isSignatureActive} onClose={() => setIsSignatureActive(false)} redirectTo="/Dashboard/Index" />
    </div>
  );
}
