import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { logout, login } from '../store/slices/authSlice';
import { selectBalancesForGroup } from '../store/slices/expensesSlice';

const Home = ({ setCurrentPage }) => {
  const dispatch = useDispatch();
  const { currentUser, isAuthenticated, users } = useSelector((state) => state.auth);
  const selectedGroupId = useSelector((state) => state.groups.selectedGroupId);
  const { netBalances, simplifiedDebts } = useSelector((state) => 
    selectBalancesForGroup(state, selectedGroupId)
  );

  const handleQuickLogin = (email) => {
    dispatch(login({ email, password: 'password123' }));
    setCurrentPage('dashboard');
  };

  return (
    <div className="w-full bg-white text-slate-800 font-sans selection:bg-brand-light">
      
      {/* Header Bar */}
      <header className="w-full px-8 py-6 bg-white">
        <div className="max-w-7xl mx-auto w-full flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => setCurrentPage('home')}>
            <span className="text-3xl font-extrabold text-brand tracking-tight font-serif">
              settly<span className="text-brand">.</span>
            </span>
          </div>
          
          {/* Navigations & Auth status aligned to the right */}
          <div className="flex items-center gap-6 md:gap-10">
            <nav className="hidden md:flex items-center gap-4 text-sm font-semibold text-slate-500">
              <button onClick={() => setCurrentPage('home')} className="nav-item-glow text-brand cursor-pointer">Home</button>
              <button 
                onClick={() => {
                  if (isAuthenticated) setCurrentPage('dashboard');
                  else setCurrentPage('auth');
                }} 
                className="nav-item-glow cursor-pointer"
              >
                Dashboard
              </button>
              <button 
                onClick={() => {
                  if (isAuthenticated) setCurrentPage('dashboard');
                  else setCurrentPage('auth');
                }} 
                className="nav-item-glow cursor-pointer"
              >
                Groups
              </button>
              <button 
                onClick={() => {
                  if (isAuthenticated) setCurrentPage('dashboard');
                  else setCurrentPage('auth');
                }} 
                className="nav-item-glow cursor-pointer"
              >
                CSV Importer
              </button>
            </nav>

            {/* Auth status buttons */}
            <div className="flex items-center gap-4">
              {isAuthenticated ? (
                <div className="flex items-center gap-3 bg-brand-light border border-brand-light rounded-full py-1.5 pl-3 pr-2">
                  <span className="text-xs font-bold text-brand-text">Hi, {currentUser.username}!</span>
                  <div 
                    className="w-8 h-8 rounded-full bg-brand text-white flex items-center justify-center font-bold shadow-md cursor-pointer hover:bg-brand-dark" 
                    title="Logout" 
                    onClick={() => dispatch(logout())}
                  >
                    {currentUser.avatar}
                  </div>
                </div>
              ) : (
                <>
                  <button 
                    onClick={() => setCurrentPage('auth')} 
                    className="px-6 py-2.5 text-sm font-semibold border border-slate-200 rounded-full hover:border-brand hover:text-brand text-slate-700 transition-all cursor-pointer"
                  >
                    Login
                  </button>
                  <button 
                    onClick={() => setCurrentPage('auth')} 
                    className="px-6 py-2.5 text-sm font-bold text-brand bg-brand-light hover:bg-brand/15 rounded-full transition-all cursor-pointer"
                  >
                    Signup
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative px-8 pt-16 pb-24 flex flex-col items-center text-center max-w-5xl mx-auto z-10">
        
        {/* Decorative background purple blur glow blob */}
        <div className="absolute top-[10%] left-1/2 -translate-x-1/2 w-[380px] h-[220px] bg-brand/8 rounded-full blur-[80px] pointer-events-none select-none -z-10"></div>

        <span className="font-sans font-bold text-xs uppercase tracking-widest text-brand mb-4 block">
          Filterable shared ledger
        </span>
        
        <h1 className="text-5xl md:text-6xl font-bold font-serif text-brand-text tracking-tight leading-tight max-w-4xl z-10">
          Share the experience. Simplify the split.
        </h1>
        
        <p className="mt-6 text-base md:text-lg text-slate-500 max-w-2xl leading-relaxed z-10">
          A super simple, easy-to-use shared ledger that tracks balances, resolves CSV anomalies, and simplifies debts for any group activity.
        </p>

        {/* CTA Buttons - colored in warm yellow and cyan gradients */}
        <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
          {isAuthenticated ? (
            <button 
              onClick={() => setCurrentPage('dashboard')} 
              className="px-8 py-3 bg-linear-to-r from-yellow-100 to-amber-200 hover:from-amber-200 hover:to-amber-300 text-amber-900 border border-amber-300 font-bold rounded-full shadow-sm shadow-amber-200/50 transition-all transform hover:-translate-y-0.5 text-xs uppercase tracking-wider cursor-pointer"
            >
              Go to Dashboard
            </button>
          ) : (
            <>
              <button 
                onClick={() => handleQuickLogin('aisha@settly.com')} 
                className="px-8 py-3 bg-linear-to-r from-[#ffe8d6] to-[#ffccb3] hover:from-[#ffccb3] hover:to-[#ffb399] text-[#803d19] border border-[#ffbf99] rounded-full font-bold shadow-sm shadow-orange-100 transition-all transform hover:-translate-y-0.5 text-xs uppercase tracking-wider cursor-pointer"
              >
                Log in as Aisha
              </button>
              <button 
                onClick={() => setCurrentPage('auth')} 
                className="px-8 py-3 bg-linear-to-r from-[#e0f9ff] to-[#b3f2ff] hover:from-[#b3f2ff] hover:to-[#8ae7ff] text-[#006070] border border-[#99efff] rounded-full font-bold shadow-sm shadow-cyan-100 transition-all transform hover:-translate-y-0.5 text-xs uppercase tracking-wider cursor-pointer"
              >
                Create Account
              </button>
            </>
          )}
        </div>

        {/* Quick Flatmates Selector */}
        {!isAuthenticated && (
          <div className="mt-8">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Or explore as other group members:</p>
            <div className="flex flex-wrap gap-2 justify-center">
              {users.slice(1).map(u => (
                <button
                  key={u.id}
                  onClick={() => handleQuickLogin(u.email)}
                  className="px-4 py-1.5 text-xs font-semibold text-slate-500 bg-white border border-slate-200 rounded-full hover:border-brand hover:text-brand transition-all shadow-xs cursor-pointer"
                >
                  {u.username}
                </button>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Preview Container: Interactive Mockup Browser Card */}
      <div className="max-w-7xl mx-auto px-8 w-full pb-20">
        <div className="bg-white border border-slate-200/70 rounded-2xl shadow-xl p-1 overflow-hidden">
          <div className="bg-slate-50 rounded-xl p-4 md:p-6 text-left border border-slate-100">
            
            {/* Mock Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-200/60 mb-6">
              <div className="flex items-center gap-3">
                <span className="text-lg font-serif font-bold text-brand">settly.</span>
                <nav className="hidden md:flex items-center gap-4 text-xs font-bold text-slate-400 pl-4 border-l border-slate-200">
                  <span className="text-brand">Active Ledger</span>
                  <span>Member Timeline</span>
                </nav>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-brand/10 text-brand flex items-center justify-center font-bold text-xs">A</span>
                <span className="text-xs font-semibold text-slate-500">Flat 404 & Goa</span>
              </div>
            </div>

            {/* Grid preview mimicking contact talent layout */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Balances list */}
              <div className="lg:col-span-2 space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Current Balances</h4>
                {netBalances.map((item) => (
                  <div key={item.userId} className="flex items-center justify-between bg-white border border-slate-100 p-4 rounded-xl shadow-xs hover:shadow-sm transition-all">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-brand-light text-brand flex items-center justify-center font-bold text-sm">
                        {item.username.charAt(0)}
                      </div>
                      <div>
                        <span className="font-bold text-slate-800 text-sm block">{item.username}</span>
                        <span className="text-xs text-slate-400">
                          {item.userId === 4 ? 'Left March 29' : item.userId === 5 ? 'Joined April 10' : 'Active Member'}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      {item.netBalance > 0 ? (
                        <span className="text-sm font-bold text-emerald-600">+₹{item.netBalance.toLocaleString()}</span>
                      ) : item.netBalance < 0 ? (
                        <span className="text-sm font-bold text-rose-500">-₹{Math.abs(item.netBalance).toLocaleString()}</span>
                      ) : (
                        <span className="text-sm font-medium text-slate-400">Settled</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Simplified Debts Widget */}
              <div className="bg-brand text-white rounded-xl p-5 shadow-lg flex flex-col justify-between">
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-brand-light/70 font-sans">Aisha's Summary</h4>
                  <p className="text-xs text-brand-light/50 mt-1">Debt-minimization transactions</p>
                  
                  <div className="mt-6 space-y-3">
                    {simplifiedDebts.length > 0 ? (
                      simplifiedDebts.slice(0, 3).map((debt, index) => (
                        <div key={index} className="text-xs border-b border-brand-dark/40 pb-2 flex justify-between items-center last:border-0">
                          <span>
                            <strong className="text-white">{debt.fromName}</strong> pays <strong className="text-white">{debt.toName}</strong>
                          </span>
                          <span className="font-bold text-yellow-300">₹{debt.amount.toLocaleString()}</span>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-brand-light italic">No payments needed! Everyone is settled.</p>
                    )}
                  </div>
                </div>

                <div className="mt-8 text-center">
                  <button 
                    onClick={() => {
                      if (isAuthenticated) setCurrentPage('dashboard');
                      else handleQuickLogin('aisha@settly.com');
                    }} 
                    className="w-full py-2 text-xs font-bold bg-white text-brand rounded-lg hover:bg-brand-light transition-colors shadow-sm cursor-pointer"
                  >
                    Open Ledger
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Feature Section */}
      <section className="bg-slate-50 border-t border-slate-100 py-20 px-8">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold font-serif text-center text-brand-text tracking-tight mb-12">
            Satisfying every flatmate's request.
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white border border-slate-100 p-6 rounded-xl shadow-xs">
              <div className="w-10 h-10 rounded-lg bg-brand-light text-brand flex items-center justify-center mb-4">
                <span className="font-bold font-serif text-sm">A</span>
              </div>
              <h3 className="font-bold font-serif text-slate-800 text-base mb-2">Aisha: Simplified Summary</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                One clear list of transactions minimizing net cash flows, rather than a giant web of bank payments.
              </p>
            </div>

            <div className="bg-white border border-slate-100 p-6 rounded-xl shadow-xs">
              <div className="w-10 h-10 rounded-lg bg-brand-light text-brand flex items-center justify-center mb-4">
                <span className="font-bold font-serif text-sm">R</span>
              </div>
              <h3 className="font-bold font-serif text-slate-800 text-base mb-2">Rohan: Math Audit Trail</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Transparency matters. Roommates can drill down into any expense to verify the exact mathematical split equations.
              </p>
            </div>

            <div className="bg-white border border-slate-100 p-6 rounded-xl shadow-xs">
              <div className="w-10 h-10 rounded-lg bg-brand-light text-brand flex items-center justify-center mb-4">
                <span className="font-bold font-serif text-sm">P</span>
              </div>
              <h3 className="font-bold font-serif text-slate-800 text-base mb-2">Priya: Multi-Currency</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Log items in USD or INR with dynamic temporal conversions for roommate travel.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-50 text-slate-400 py-10 text-center border-t border-slate-100 text-xs">
        <p className="font-bold text-slate-700 mb-1">settly.</p>
        <p>© 2026 Settly. Built for Spreetail Internship Evaluation.</p>
      </footer>
    </div>
  );
};

export default Home;
