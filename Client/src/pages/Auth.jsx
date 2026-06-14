import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { login, register, clearError } from '../store/slices/authSlice';
import { useNavigate, useLocation } from 'react-router-dom';

// ── Floating expense card used in the right-side illustration ─────────────────
const FloatingCard = ({ label, amount, emoji, style, delay = '0s', direction = 'up' }) => (
  <div
    className={`absolute flex items-center gap-2.5 bg-white/90 backdrop-blur-sm rounded-2xl px-4 py-2.5 shadow-lg shadow-purple-900/15 border border-white/60 select-none ${direction === 'up' ? 'animate-float-slow' : 'animate-float-delayed'}`}
    style={{ animationDelay: delay, ...style }}
  >
    <span className="text-lg leading-none">{emoji}</span>
    <span className="text-xs font-bold text-slate-700 whitespace-nowrap">{label}</span>
    <span className="ml-1 text-xs font-extrabold text-brand whitespace-nowrap">{amount}</span>
  </div>
);

// ── Main Auth Page ─────────────────────────────────────────────────────────────
const Auth = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { error, isAuthenticated } = useSelector((state) => state.auth);

  // Determine mode from route — /login → login mode, /signup → signup mode
  const isLogin = location.pathname === '/login';

  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (isLogin) {
      dispatch(login({ email, password }));
    } else {
      dispatch(register({ username, email, password }));
    }
  };

  const quickLogin = (mail) => {
    dispatch(login({ email: mail, password: 'password123' }));
  };

  React.useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard');
    }
    return () => {
      dispatch(clearError());
    };
  }, [isAuthenticated, navigate, dispatch]);

  return (
    <div className="min-h-screen w-full bg-[#f8f7fc] flex items-center justify-center p-4 font-sans">
      {/* Outer card */}
      <div className="w-full max-w-5xl bg-white rounded-3xl shadow-2xl shadow-purple-200/40 overflow-hidden flex flex-col md:flex-row min-h-[600px]">

        {/* ── LEFT: Form panel ───────────────────────────────────────────────── */}
        <div className="flex-1 flex flex-col justify-center px-10 py-12 md:px-14">
          {/* Logo */}
          <button
            onClick={() => navigate('/')}
            className="text-2xl font-extrabold font-serif text-brand tracking-tight mb-10 text-left cursor-pointer w-fit"
          >
            settly<span className="text-brand">.</span>
          </button>

          {/* Heading */}
          <div className="mb-8">
            <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-brand bg-brand-light px-3 py-1 rounded-full mb-4">
              <span>⚡</span> Shared Ledger
            </span>
            <h1 className="text-3xl font-bold font-serif text-slate-900 leading-tight mt-2">
              {isLogin ? 'Welcome back.' : 'Start settling.'}
            </h1>
            <p className="text-sm text-slate-500 mt-2 leading-relaxed">
              {isLogin
                ? 'Log in to track balances, audit expenses, and simplify group debt.'
                : 'Create an account to start managing shared expenses with your group.'}
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-5 bg-rose-50 border-l-4 border-rose-400 p-3 rounded-lg text-xs font-semibold text-rose-700">
              {error}
            </div>
          )}

          {/* Form */}
          <form className="space-y-4" onSubmit={handleSubmit}>
            {!isLogin && (
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Username
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Aisha"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-4 py-3 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand transition-all placeholder-slate-300"
                />
              </div>
            )}

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Email address
              </label>
              <input
                type="email"
                required
                placeholder="you@settly.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand transition-all placeholder-slate-300"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Password
              </label>
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand transition-all placeholder-slate-300"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3 text-sm font-bold text-white bg-brand hover:bg-brand-dark rounded-xl shadow-md shadow-brand/25 transition-all transform hover:-translate-y-0.5 cursor-pointer mt-2"
            >
              {isLogin ? 'Sign In →' : 'Create Account →'}
            </button>
          </form>

          {/* Toggle between routes */}
          <p className="mt-5 text-xs text-slate-500 text-center">
            {isLogin ? "Don't have an account? " : 'Already have an account? '}
            <button
              onClick={() => {
                dispatch(clearError());
                navigate(isLogin ? '/signup' : '/login');
              }}
              className="font-bold text-brand hover:text-brand-dark cursor-pointer"
            >
              {isLogin ? 'Sign up' : 'Sign in'}
            </button>
          </p>

          {/* Demo accounts — only shown on login screen */}
          {isLogin && (
            <div className="mt-8 border-t border-slate-100 pt-6">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center mb-3">
                Explore with demo accounts
              </p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { name: '🏠 Aisha', email: 'aisha@settly.com' },
                  { name: '📊 Rohan', email: 'rohan@settly.com' },
                ].map(({ name, email: mail }) => (
                  <button
                    key={name}
                    onClick={() => quickLogin(mail)}
                    className="py-2 px-3 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-brand-light hover:border-brand hover:text-brand transition-all bg-white cursor-pointer"
                  >
                    {name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── RIGHT: Illustration panel ──────────────────────────────────────── */}
        <div
          className="hidden md:flex flex-1 relative overflow-hidden rounded-none md:rounded-r-3xl items-center justify-center"
          style={{
            background: 'linear-gradient(145deg, #7c3aed 0%, #6d28d9 40%, #5b21b6 100%)',
          }}
        >
          {/* Dot pattern overlay */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.07) 1px, transparent 1px)',
              backgroundSize: '22px 22px',
            }}
          />

          {/* Soft glows */}
          <div className="absolute top-0 right-0 w-72 h-72 rounded-full bg-purple-400/20 blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-56 h-56 rounded-full bg-violet-300/15 blur-2xl pointer-events-none" />

          {/* Central mock ledger card */}
          <div className="relative z-10 flex flex-col gap-3 w-56">
            <div className="bg-white/95 backdrop-blur-sm rounded-2xl p-5 shadow-2xl shadow-purple-900/30 border border-white/60">
              <div className="flex items-center justify-between mb-4">
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Group Ledger</span>
                <span className="w-7 h-7 rounded-full bg-brand flex items-center justify-center text-white text-xs font-black">S</span>
              </div>
              {[
                { label: 'Groceries', who: 'Aisha', amt: '₹2,400', color: 'text-rose-500' },
                { label: 'Netflix', who: 'Rohan', amt: '₹649', color: 'text-amber-500' },
                { label: 'Electricity', who: 'Priya', amt: '₹1,820', color: 'text-brand' },
              ].map(({ label, who, amt, color }) => (
                <div key={label} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                  <div>
                    <p className="text-xs font-bold text-slate-700">{label}</p>
                    <p className="text-[10px] text-slate-400">Paid by {who}</p>
                  </div>
                  <span className={`text-xs font-extrabold ${color}`}>{amt}</span>
                </div>
              ))}
            </div>

            {/* Settled badge */}
            <div className="bg-emerald-500/90 backdrop-blur-sm rounded-xl px-4 py-2.5 flex items-center gap-2 shadow-lg shadow-emerald-900/20 self-end">
              <span className="text-base">✓</span>
              <span className="text-xs font-bold text-white">All Settled!</span>
            </div>
          </div>

          {/* Floating expense chips */}
          <FloatingCard label="Rent split" amount="₹8,000" emoji="🏠" style={{ top: '12%', left: '-8%' }} delay="0s" direction="up" />
          <FloatingCard label="Dinner" amount="₹1,240" emoji="🍕" style={{ top: '28%', right: '-10%' }} delay="1.2s" direction="down" />
          <FloatingCard label="OTT bundle" amount="₹649" emoji="🎬" style={{ bottom: '22%', left: '-6%' }} delay="0.6s" direction="down" />
          <FloatingCard label="Utilities" amount="₹3,100" emoji="⚡" style={{ bottom: '10%', right: '-8%' }} delay="1.8s" direction="up" />

          {/* Bottom tagline */}
          <div className="absolute bottom-8 left-0 right-0 text-center px-6">
            <p className="text-white/60 text-[11px] font-medium leading-relaxed">
              Simplify group expenses.<br />
              <span className="text-white/40">No more spreadsheet chaos.</span>
            </p>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Auth;
