import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DotLottiePlayer } from '@dotlottie/react-player';
import { auth, getDashboardRoute, roleStatusToStep } from '../services/api';
import '../assets/css/pages/login.css';

// ── Demo accounts for portfolio testing ──
const DEMO_ACCOUNTS: Record<string, { empCode: number; empName: string; stepOrder: number; roleStatus: string }> = {
  requester:  { empCode: 100001, empName: 'Demo Requester',    stepOrder: 0, roleStatus: 'Developer' },
  teamlead:   { empCode: 100002, empName: 'Demo Team Lead',    stepOrder: 1, roleStatus: 'TL' },
  verifier:   { empCode: 100003, empName: 'Demo SPM',          stepOrder: 2, roleStatus: 'SPM' },
  approver:   { empCode: 100004, empName: 'Demo CTO',          stepOrder: 3, roleStatus: 'Approver' },
  dbrelease:  { empCode: 100005, empName: 'Demo DB Release',   stepOrder: 4, roleStatus: 'DB_RELEASE' },
  apprelease: { empCode: 100006, empName: 'Demo App Release',  stepOrder: 4, roleStatus: 'APPLICATION_RELEASE' },
};
const DEMO_PASSWORD = 'admin';

const QUICK_LOGINS = [
  { username: 'requester', label: 'Requester',  color: '#0084FF' },
  { username: 'teamlead',  label: 'Team Lead',  color: '#F59E0B' },
  { username: 'verifier',  label: 'SPM',        color: '#8B5CF6' },
  { username: 'approver',  label: 'CTO',        color: '#10B981' },
  { username: 'dbrelease', label: 'DB Release', color: '#EC4899' },
  { username: 'apprelease',label: 'App Release',color: '#F43F5E' },
];

export default function Login() {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Check demo accounts first (works without backend)
    const demoUser = DEMO_ACCOUNTS[username.toLowerCase()];
    if (demoUser && password === DEMO_PASSWORD) {
      auth.saveSession({
        empCode: demoUser.empCode,
        empName: demoUser.empName,
        stepOrder: demoUser.stepOrder,
        roleStatus: demoUser.roleStatus,
        approvals: [{ stepOrder: demoUser.stepOrder, roleStatus: demoUser.roleStatus }],
      });
      const route = getDashboardRoute(demoUser.stepOrder);
      navigate(route);
      return;
    }

    // Otherwise, hit the real .NET 8 API
    try {
      const result = await auth.login({ empCode: username, password });
      if (result.success && result.data) {
        auth.saveSession(result.data);
        const firstApproval = result.data.approvals?.[0];
        const step = firstApproval?.stepOrder ?? result.data.stepOrder ?? roleStatusToStep(firstApproval?.roleStatus) ?? 0;
        const route = getDashboardRoute(step);
        navigate(route);
      } else {
        setError(result.message || 'Invalid credentials. Use demo accounts or connect to backend.');
        setLoading(false);
      }
    } catch (err) {
      setError('Backend offline. Use the quick login buttons below for demo.');
      setLoading(false);
    }
  };

  const quickLogin = (user: string) => {
    setUsername(user);
    setPassword(DEMO_PASSWORD);
    // Trigger login immediately
    const demoUser = DEMO_ACCOUNTS[user];
    if (demoUser) {
      setLoading(true);
      auth.saveSession({
        empCode: demoUser.empCode,
        empName: demoUser.empName,
        stepOrder: demoUser.stepOrder,
        roleStatus: demoUser.roleStatus,
        approvals: [{ stepOrder: demoUser.stepOrder, roleStatus: demoUser.roleStatus }],
      });
      const route = getDashboardRoute(demoUser.stepOrder);
      navigate(route);
    }
  };

  return (
    <>
      {loading && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.4)',
          backdropFilter: 'blur(10px)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <div style={{ width: '250px', height: '250px' }}>
            <DotLottiePlayer src={`${import.meta.env.BASE_URL}loading.lottie`} autoplay loop />
          </div>
        </div>
      )}
      <div className="login-wrapper">
        <div className="particles">
          <span className="particle p1"></span>
          <span className="particle p2"></span>
          <span className="particle p3"></span>
          <span className="particle p4"></span>
          <span className="particle p5"></span>
          <span className="particle p6"></span>
        </div>

        <div className="brand-panel">
          <div className="brand-panel-inner">
            <div className="ambient-brand">
              <div className="ambient-main">
                <div className="vertical-accent"></div>
                <div>
                  <h1 className="ambient-title">Release Module</h1>
                  <p className="ambient-desc">
                    Enterprise software deployment gateway.<br />Authorized access only.
                  </p>
                </div>
              </div>

              {/* ── Quick Login ── */}
              <div style={{ animation: 'fadeInUp 0.8s ease-out 0.6s both' }}>
                <p style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.3)', fontFamily: 'monospace', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 12 }}>
                  Quick Login · Pass: admin
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {QUICK_LOGINS.map((q) => (
                    <button
                      key={q.username}
                      type="button"
                      onClick={() => quickLogin(q.username)}
                      style={{
                        padding: '8px 16px',
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        fontFamily: 'monospace',
                        letterSpacing: '0.1em',
                        textTransform: 'uppercase',
                        color: q.color,
                        background: `${q.color}15`,
                        border: `1px solid ${q.color}30`,
                        borderRadius: 10,
                        cursor: 'pointer',
                        transition: 'all 0.25s ease',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = `${q.color}30`;
                        e.currentTarget.style.borderColor = `${q.color}60`;
                        e.currentTarget.style.transform = 'translateY(-2px)';
                        e.currentTarget.style.boxShadow = `0 8px 25px ${q.color}25`;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = `${q.color}15`;
                        e.currentTarget.style.borderColor = `${q.color}30`;
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = 'none';
                      }}
                    >
                      {q.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="ambient-footer">
                <div className="version-tag">build 4.2.0</div>
                <div className="company-tag">Enterprise Software Deployment</div>
              </div>
            </div>
          </div>
        </div>

        <div className="form-panel">
          <div className="form-panel-inner">
            <div className="form-logo">
              <div className="logo-img" style={{ width: 64, height: 64, borderRadius: '50%', background: 'linear-gradient(135deg, #0084FF, #6C5CE7)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/></svg>
              </div>
            </div>

            <div className="form-header">
              <h2 className="welcome-title">Welcome Back</h2>
              <p className="welcome-sub">Enter your credentials to access your account</p>
            </div>

            <form className="login-form" onSubmit={handleLogin}>
              <div className="input-group">
                <label htmlFor="username" className="input-label">Username</label>
                <div className="input-wrapper">
                  <svg className="input-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" />
                  </svg>
                  <input
                    id="username" name="username" type="text" autoComplete="username" required
                    placeholder="Username" className="form-input" maxLength={30}
                    value={username} onChange={(e) => setUsername(e.target.value)}
                  />
                </div>
              </div>

              <div className="input-group">
                <label htmlFor="password" className="input-label">Password</label>
                <div className="input-wrapper">
                  <svg className="input-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                  </svg>
                  <input
                    id="password" name="password" type={showPassword ? "text" : "password"}
                    autoComplete="current-password" required placeholder="Password"
                    className="form-input" maxLength={30} value={password} onChange={(e) => setPassword(e.target.value)}
                  />
                  <button type="button" className="toggle-password" onClick={() => setShowPassword(!showPassword)}>
                    {!showPassword ? (
                      <svg className="eye-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zm4.261 4.26l1.514 1.515a2.003 2.003 0 012.45 2.45l1.514 1.514a4 4 0 00-5.478-5.478z" clipRule="evenodd" />
                        <path d="M12.454 16.697L9.75 13.992a4 4 0 01-3.742-3.741L2.335 6.578A9.98 9.98 0 00.458 10c1.274 4.057 5.065 7 9.542 7 .847 0 1.669-.105 2.454-.303z" />
                      </svg>
                    ) : (
                      <svg className="eye-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                        <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {error && (
                <div style={{ color: '#ef4444', fontSize: '12px', fontWeight: '600', textAlign: 'center', padding: '8px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '8px' }}>
                  {error}
                </div>
              )}

              <button type="submit" className="signin-btn" id="signin-btn" disabled={loading}>
                <span className="btn-text">{loading ? 'Signing In...' : 'Sign In'}</span>
                {!loading && (
                  <svg className="btn-arrow" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                )}
              </button>
            </form>

          </div>
        </div>
      </div>
    </>
  );
}

