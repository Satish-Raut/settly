import React, { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate, useLocation } from 'react-router-dom';
import { logout } from '../store/slices/authSlice';
import { Menu, X, User, LogOut, LayoutDashboard, Users, FileSpreadsheet, Home as HomeIcon } from 'lucide-react';

const Navbar = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();

  const { currentUser, isAuthenticated } = useSelector((state) => state.auth);
  
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  const handleLogout = () => {
    setShowProfileMenu(false);
    setShowMobileMenu(false);
    dispatch(logout());
    navigate('/');
  };

  const isActive = (path) => location.pathname === path;

  const navItems = [
    { label: 'Home', path: '/', icon: HomeIcon, requireAuth: false },
    { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard, requireAuth: true },
    { label: 'Groups', path: '/groups', icon: Users, requireAuth: true },
    { label: 'CSV Importer', path: '/import', icon: FileSpreadsheet, requireAuth: true },
  ];

  // Filter items based on auth state
  const visibleNavItems = navItems.filter(item => !item.requireAuth || isAuthenticated);

  const handleNavClick = (path) => {
    setShowMobileMenu(false);
    navigate(path);
  };

  return (
    <header className="bg-white/95 backdrop-blur-md border-b border-slate-200/80 sticky top-0 z-50 w-full">
      <div className="max-w-7xl mx-auto px-6 md:px-8 h-16 flex items-center justify-between">
        
        {/* Brand Logo */}
        <div
          className="flex items-center gap-2 cursor-pointer"
          onClick={() => handleNavClick('/')}
        >
          <span className="text-2xl font-black font-serif text-brand tracking-tight">
            settly<span className="text-brand">.</span>
          </span>
        </div>

        {/* Desktop Navigation links */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-semibold text-slate-500">
          {visibleNavItems.map((item) => (
            <button
              key={item.label}
              onClick={() => handleNavClick(item.path)}
              className={`nav-item-glow cursor-pointer ${
                isActive(item.path) ? 'text-brand font-bold' : 'text-slate-500 hover:text-brand'
              }`}
            >
              {item.label}
            </button>
          ))}
        </nav>

        {/* Right Section: Auth and Mobile Menu Button */}
        <div className="flex items-center gap-4">
          
          {/* Desktop Auth Section */}
          <div className="hidden md:flex items-center gap-4">
            {isAuthenticated && currentUser ? (
              <div className="relative">
                <div
                  className="flex items-center gap-3 bg-brand-light border border-brand-light rounded-full py-1.5 pl-3 pr-2 cursor-pointer select-none"
                  onClick={() => setShowProfileMenu(prev => !prev)}
                >
                  <span className="text-xs font-bold text-brand-text">
                    Hi, {currentUser.username}!
                  </span>
                  <div
                    className="w-8 h-8 rounded-full bg-brand text-white flex items-center justify-center font-bold shadow-md hover:bg-brand-dark transition-colors"
                  >
                    {currentUser.avatar || currentUser.username.charAt(0).toUpperCase()}
                  </div>
                </div>
                
                {showProfileMenu && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowProfileMenu(false)} />
                    <div className="absolute right-0 top-12 w-44 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden animate-fade-in">
                      <button
                        onClick={() => { setShowProfileMenu(false); navigate('/profile'); }}
                        className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-brand-light hover:text-brand transition-colors cursor-pointer"
                      >
                        <User className="w-4 h-4 text-slate-400" /> View Profile
                      </button>
                      <div className="border-t border-slate-100" />
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm font-semibold text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                      >
                        <LogOut className="w-4 h-4 text-rose-400" /> Sign Out
                      </button>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <button
                  onClick={() => navigate('/login')}
                  className="px-5 py-2 text-sm font-semibold border border-slate-200 rounded-full hover:border-brand hover:text-brand text-slate-700 transition-all cursor-pointer"
                >
                  Login
                </button>
                <button
                  onClick={() => navigate('/signup')}
                  className="px-5 py-2 text-sm font-bold text-brand bg-brand-light hover:bg-brand/15 rounded-full transition-all cursor-pointer"
                >
                  Signup
                </button>
              </div>
            )}
          </div>

          {/* Hamburger Menu Toggle Button (Mobile) */}
          <button
            onClick={() => setShowMobileMenu(prev => !prev)}
            className="md:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100 hover:text-slate-800 transition-all focus:outline-hidden cursor-pointer"
            aria-label="Toggle navigation menu"
          >
            {showMobileMenu ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>

        </div>
      </div>

      {/* Mobile Navigation Menu Dropdown */}
      {showMobileMenu && (
        <div className="md:hidden bg-white border-t border-slate-200/80 shadow-lg animate-fade-in overflow-hidden">
          <div className="px-4 py-3 space-y-1">
            {visibleNavItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.label}
                  onClick={() => handleNavClick(item.path)}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-semibold rounded-xl transition-all cursor-pointer ${
                    isActive(item.path)
                      ? 'bg-brand/8 text-brand'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                </button>
              );
            })}

            {/* Auth Section in Mobile Menu */}
            <div className="border-t border-slate-100 mt-2 pt-2">
              {isAuthenticated && currentUser ? (
                <div className="space-y-1">
                  <div className="px-4 py-2 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-brand text-white flex items-center justify-center font-bold">
                      {currentUser.avatar || currentUser.username.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-800">{currentUser.username}</p>
                      <p className="text-[10px] text-slate-400 font-semibold">{currentUser.email}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleNavClick('/profile')}
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm font-semibold rounded-xl text-slate-600 hover:bg-slate-50 hover:text-slate-900 cursor-pointer"
                  >
                    <User className="w-4 h-4 text-slate-400" /> View Profile
                  </button>
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm font-semibold rounded-xl text-rose-600 hover:bg-rose-50 cursor-pointer"
                  >
                    <LogOut className="w-4 h-4 text-rose-400" /> Sign Out
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2 p-2">
                  <button
                    onClick={() => handleNavClick('/login')}
                    className="w-full py-2.5 text-center text-sm font-bold border border-slate-200 rounded-xl hover:border-brand hover:text-brand text-slate-700 cursor-pointer"
                  >
                    Login
                  </button>
                  <button
                    onClick={() => handleNavClick('/signup')}
                    className="w-full py-2.5 text-center text-sm font-bold text-white bg-brand hover:bg-brand-dark rounded-xl shadow-xs cursor-pointer"
                  >
                    Signup
                  </button>
                </div>
              )}
            </div>

          </div>
        </div>
      )}
    </header>
  );
};

export default Navbar;
