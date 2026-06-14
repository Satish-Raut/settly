import React from "react";
import { useSelector, useDispatch } from "react-redux";
import { logout, login } from "../store/slices/authSlice";
import { selectBalancesForGroup } from "../store/slices/expensesSlice";
import { useNavigate } from "react-router-dom";

const Home = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { currentUser, isAuthenticated, users } = useSelector(
    (state) => state.auth,
  );
  const selectedGroupId = useSelector((state) => state.groups.selectedGroupId);
  const { netBalances, simplifiedDebts } = useSelector((state) =>
    selectBalancesForGroup(state, selectedGroupId),
  );

  const handleQuickLogin = (email) => {
    dispatch(login({ email, password: "password123" }));
    navigate("/dashboard");
  };

  return (
    <div className="w-full bg-white text-slate-800 font-sans selection:bg-brand-light">
      {/* Header Bar */}
      <header className="w-full px-8 py-6 bg-white">
        <div className="max-w-7xl mx-auto w-full flex items-center justify-between">
          <div
            className="flex items-center gap-2 cursor-pointer"
            onClick={() => navigate("/")}
          >
            <span className="text-3xl font-extrabold text-brand tracking-tight font-serif">
              settly<span className="text-brand">.</span>
            </span>
          </div>

          {/* Navigations & Auth status aligned to the right */}
          <div className="flex items-center gap-6 md:gap-10">
            <nav className="hidden md:flex items-center gap-4 text-sm font-semibold text-slate-500">
              <button
                onClick={() => navigate("/")}
                className="nav-item-glow text-brand cursor-pointer"
              >
                Home
              </button>
              <button
                onClick={() => {
                  if (isAuthenticated) navigate("/dashboard");
                  else navigate("/login");
                }}
                className="nav-item-glow cursor-pointer"
              >
                Dashboard
              </button>
              <button
                onClick={() => {
                  if (isAuthenticated) navigate("/dashboard");
                  else navigate("/login");
                }}
                className="nav-item-glow cursor-pointer"
              >
                Groups
              </button>
              <button
                onClick={() => {
                  if (isAuthenticated) navigate("/dashboard");
                  else navigate("/login");
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
                  <span className="text-xs font-bold text-brand-text">
                    Hi, {currentUser.username}!
                  </span>
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
                    onClick={() => navigate("/login")}
                    className="px-6 py-2.5 text-sm font-semibold border border-slate-200 rounded-full hover:border-brand hover:text-brand text-slate-700 transition-all cursor-pointer"
                  >
                    Login
                  </button>
                  <button
                    onClick={() => navigate("/signup")}
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
          A super simple, easy-to-use shared ledger that tracks balances,
          resolves CSV anomalies, and simplifies debts for any group activity.
        </p>

        {/* CTA Buttons - colored in warm yellow and cyan gradients */}
        <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
          {isAuthenticated ? (
            <button
              onClick={() => navigate("/dashboard")}
              className="px-8 py-3 bg-linear-to-r from-yellow-100 to-amber-200 hover:from-amber-200 hover:to-amber-300 text-amber-900 border border-amber-300 font-bold rounded-full shadow-sm shadow-amber-200/50 transition-all transform hover:-translate-y-0.5 text-xs uppercase tracking-wider cursor-pointer"
            >
              Go to Dashboard
            </button>
          ) : (
            <>
              <button
                onClick={() => handleQuickLogin("aisha@settly.com")}
                className="px-8 py-3 bg-linear-to-r from-[#ffe8d6] to-[#ffccb3] hover:from-[#ffccb3] hover:to-[#ffb399] text-[#803d19] border border-[#ffbf99] rounded-full font-bold shadow-sm shadow-orange-100 transition-all transform hover:-translate-y-0.5 text-xs uppercase tracking-wider cursor-pointer"
              >
                Log in as Aisha
              </button>
              <button
                onClick={() => navigate("/signup")}
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
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">
              Or explore as other group members:
            </p>
            <div className="flex flex-wrap gap-2 justify-center">
              {users.slice(1).map((u) => (
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
                <span className="text-lg font-serif font-bold text-brand">
                  settly.
                </span>
                <nav className="hidden md:flex items-center gap-4 text-xs font-bold text-slate-400 pl-4 border-l border-slate-200">
                  <span className="text-brand">Active Ledger</span>
                  <span>Member Timeline</span>
                </nav>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-brand/10 text-brand flex items-center justify-center font-bold text-xs">
                  A
                </span>
                <span className="text-xs font-semibold text-slate-500">
                  Flat 404 & Goa
                </span>
              </div>
            </div>

            {/* Grid preview mimicking contact talent layout */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Balances list */}
              <div className="lg:col-span-2 space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Current Balances
                </h4>
                {netBalances.map((item) => (
                  <div
                    key={item.userId}
                    className="flex items-center justify-between bg-white border border-slate-100 p-4 rounded-xl shadow-xs hover:shadow-sm transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-brand-light text-brand flex items-center justify-center font-bold text-sm">
                        {item.username.charAt(0)}
                      </div>
                      <div>
                        <span className="font-bold text-slate-800 text-sm block">
                          {item.username}
                        </span>
                        <span className="text-xs text-slate-400">
                          {item.userId === 4
                            ? "Left March 29"
                            : item.userId === 5
                              ? "Joined April 10"
                              : "Active Member"}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      {item.netBalance > 0 ? (
                        <span className="text-sm font-bold text-emerald-600">
                          +₹{item.netBalance.toLocaleString()}
                        </span>
                      ) : item.netBalance < 0 ? (
                        <span className="text-sm font-bold text-rose-500">
                          -₹{Math.abs(item.netBalance).toLocaleString()}
                        </span>
                      ) : (
                        <span className="text-sm font-medium text-slate-400">
                          Settled
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Simplified Debts Widget */}
              <div className="bg-brand text-white rounded-xl p-5 shadow-lg flex flex-col justify-between">
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-brand-light/70 font-sans">
                    Aisha's Summary
                  </h4>
                  <p className="text-xs text-brand-light/50 mt-1">
                    Debt-minimization transactions
                  </p>

                  <div className="mt-6 space-y-3">
                    {simplifiedDebts.length > 0 ? (
                      simplifiedDebts.slice(0, 3).map((debt, index) => (
                        <div
                          key={index}
                          className="text-xs border-b border-brand-dark/40 pb-2 flex justify-between items-center last:border-0"
                        >
                          <span>
                            <strong className="text-white">
                              {debt.fromName}
                            </strong>{" "}
                            pays{" "}
                            <strong className="text-white">
                              {debt.toName}
                            </strong>
                          </span>
                          <span className="font-bold text-yellow-300">
                            ₹{debt.amount.toLocaleString()}
                          </span>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-brand-light italic">
                        No payments needed! Everyone is settled.
                      </p>
                    )}
                  </div>
                </div>

                <div className="mt-8 text-center">
                  <button
                    onClick={() => {
                      if (isAuthenticated) navigate("/dashboard");
                      else handleQuickLogin("aisha@settly.com");
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
              <h3 className="font-bold font-serif text-slate-800 text-base mb-2">
                Aisha: Simplified Summary
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                One clear list of transactions minimizing net cash flows, rather
                than a giant web of bank payments.
              </p>
            </div>

            <div className="bg-white border border-slate-100 p-6 rounded-xl shadow-xs">
              <div className="w-10 h-10 rounded-lg bg-brand-light text-brand flex items-center justify-center mb-4">
                <span className="font-bold font-serif text-sm">R</span>
              </div>
              <h3 className="font-bold font-serif text-slate-800 text-base mb-2">
                Rohan: Math Audit Trail
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Transparency matters. Roommates can drill down into any expense
                to verify the exact mathematical split equations.
              </p>
            </div>

            <div className="bg-white border border-slate-100 p-6 rounded-xl shadow-xs">
              <div className="w-10 h-10 rounded-lg bg-brand-light text-brand flex items-center justify-center mb-4">
                <span className="font-bold font-serif text-sm">P</span>
              </div>
              <h3 className="font-bold font-serif text-slate-800 text-base mb-2">
                Priya: Multi-Currency
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Log items in USD or INR with dynamic temporal conversions for
                roommate travel.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer
        className="relative overflow-hidden"
        style={{
          background:
            "linear-gradient(to bottom, #ffffff 0%, #f5f0ff 8%, #ede8ff 100%)",
          backgroundImage:
            "radial-gradient(circle, rgba(124,58,237,0.055) 1.2px, transparent 1.2px)",
          backgroundSize: "26px 26px",
        }}
      >
        {/* Soft top fade bridge from white → lavender */}
        <div
          className="absolute inset-x-0 top-0 h-28 pointer-events-none"
          style={{
            background:
              "linear-gradient(to bottom, #ffffff 0%, transparent 100%)",
          }}
        ></div>

        {/* Ambient purple glow at center-top */}
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[320px] rounded-full pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse at center, rgba(124,58,237,0.09) 0%, transparent 70%)",
          }}
        ></div>
        {/* Secondary soft glow bottom-right */}
        <div
          className="absolute bottom-0 right-1/4 w-[500px] h-[250px] rounded-full pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse at center, rgba(139,92,246,0.06) 0%, transparent 70%)",
          }}
        ></div>

        {/* === TOP HALF: Giant "Settly." watermark === */}
        <div className="relative w-full flex flex-col items-center justify-center pt-16 pb-4 overflow-hidden">
          {/* Giant text — fades at the bottom */}
          <div
            className="relative select-none pointer-events-none"
            style={{
              maskImage:
                "linear-gradient(to bottom, rgba(0,0,0,1) 15%, rgba(0,0,0,0) 100%)",
              WebkitMaskImage:
                "linear-gradient(to bottom, rgba(0,0,0,1) 15%, rgba(0,0,0,0) 100%)",
            }}
          >
            <span
              className="block font-black tracking-tight leading-none text-center"
              style={{
                fontSize: "clamp(80px, 16vw, 240px)",
                fontFamily: "var(--font-sans)",
                background:
                  "linear-gradient(135deg, rgba(124,58,237,0.18) 0%, rgba(139,92,246,0.28) 45%, rgba(109,40,217,0.14) 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
                letterSpacing: "-0.04em",
              }}
            >
              Settly.
            </span>
          </div>

          {/* Tagline below the watermark */}
          <p className="mt-3 text-sm md:text-base text-slate-500 max-w-lg text-center font-medium leading-relaxed px-6">
            Share the experience. Simplify the split.
            <br />
            <span className="text-slate-400 text-xs">
              Effortless ledger tracking for any group, anywhere.
            </span>
          </p>
        </div>

        {/* === DIVIDER === */}
        <div className="max-w-6xl mx-auto px-8">
          <div className="w-full h-px bg-linear-to-r from-transparent via-brand/20 to-transparent"></div>
        </div>

        {/* === MIDDLE: Three-column grid === */}
        <div className="max-w-6xl mx-auto px-8 py-12 grid grid-cols-1 md:grid-cols-3 gap-10 text-left">
          {/* COLUMN 1 — Brand */}
          <div className="space-y-4">
            <span className="text-lg font-extrabold font-serif text-brand-text tracking-tight">
              settly<span className="text-brand">.</span>
            </span>
            <p className="text-xs text-slate-500 leading-relaxed max-w-xs">
              A high-fidelity shared ledger built to satisfy any group. Ingest,
              audit, and settle expenses with absolute transparency.
            </p>
            <div className="flex gap-3 pt-1">
              <a
                href="https://github.com/Satish-Raut/settly.git"
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 rounded-lg bg-brand-light border border-brand/20 flex items-center justify-center text-brand hover:bg-brand hover:text-white transition-all cursor-pointer"
                title="GitHub Repository"
              >
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                </svg>
              </a>
            </div>
          </div>

          {/* COLUMN 2 — Quick Links */}
          <div className="space-y-4">
            <h4 className="text-[10px] uppercase font-bold tracking-widest text-brand/60">
              Quick Links
            </h4>
            <ul className="space-y-2.5 text-xs font-semibold text-slate-500">
              {[
                { label: "Home", action: () => navigate("/") },
                {
                  label: "Dashboard",
                  action: () =>
                    isAuthenticated
                      ? navigate("/dashboard")
                      : navigate("/login"),
                },
                {
                  label: "Groups",
                  action: () =>
                    isAuthenticated
                      ? navigate("/dashboard")
                      : navigate("/login"),
                },
                {
                  label: "CSV Importer",
                  action: () =>
                    isAuthenticated ? navigate("/import") : navigate("/login"),
                },
              ].map(({ label, action }) => (
                <li key={label}>
                  <button
                    onClick={action}
                    className="flex items-center gap-2 hover:text-brand transition-colors cursor-pointer group"
                  >
                    <span className="w-1 h-1 rounded-full bg-brand/30 group-hover:bg-brand transition-colors"></span>
                    {label}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* COLUMN 3 — Contact & Tech */}
          <div className="space-y-4">
            <h4 className="text-[10px] uppercase font-bold tracking-widest text-brand/60">
              Contact & Tech
            </h4>
            <div className="space-y-3 text-xs font-semibold text-slate-500">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-brand-light border border-brand/20 flex items-center justify-center text-brand text-sm">
                  ✉
                </div>
                <span>support@settly.com</span>
              </div>
              
              <div className="flex flex-wrap items-center gap-2 pt-2">
                <span className="text-[10px] text-slate-400">Built with:</span>
                {["React", "Redux", "Tailwind"].map((tech) => (
                  <span
                    key={tech}
                    className="px-2 py-0.5 text-[10px] rounded-md bg-brand-light border border-brand/20 text-brand-text"
                  >
                    {tech}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* === BOTTOM BAR === */}
        <div className="max-w-6xl mx-auto px-8">
          <div className="w-full h-px bg-linear-to-r from-transparent via-brand/20 to-transparent"></div>
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-5 text-[10px] text-slate-400 uppercase tracking-widest">
            <p>© 2026 Settly.</p>
            <button
              onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
              className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-brand-light border border-brand/20 hover:bg-brand hover:text-white transition-all text-[9px] font-bold text-brand cursor-pointer"
            >
              ↑ Back to Top
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Home;
