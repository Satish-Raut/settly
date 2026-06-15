import React, { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { logout } from '../store/slices/authSlice';

const Profile = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { currentUser, isAuthenticated } = useSelector((state) => state.auth);
  const groups = useSelector((state) => state.groups.groups);

  useEffect(() => {
    if (!isAuthenticated) navigate('/login');
  }, [isAuthenticated, navigate]);

  if (!currentUser) return null;

  const totalGroups = groups.length;
  const totalMemberships = groups.reduce((acc, g) => acc + (g.memberships?.length || 0), 0);
  const joinDate = new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' });

  const handleLogout = () => {
    dispatch(logout());
    navigate('/');
  };

  const avatarColors = ['#7C3AED', '#0EA5E9', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];
  const avatarColor = avatarColors[currentUser.id % avatarColors.length] || '#7C3AED';

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-50 via-purple-50/30 to-slate-100 font-sans">

      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-slate-200/80 sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-8 h-16 flex items-center justify-between">
          <button onClick={() => navigate('/')} className="text-2xl font-black font-serif text-brand tracking-tight cursor-pointer">
            settly.
          </button>
          <nav className="flex items-center gap-6 text-sm font-semibold text-slate-500">
            <button onClick={() => navigate('/dashboard')} className="hover:text-brand transition-colors cursor-pointer">Dashboard</button>
            <button onClick={() => navigate('/groups')} className="hover:text-brand transition-colors cursor-pointer">Groups</button>
            <button onClick={() => navigate('/import')} className="hover:text-brand transition-colors cursor-pointer">CSV Importer</button>
          </nav>
          <button
            onClick={handleLogout}
            className="px-4 py-2 text-xs font-bold text-rose-600 border border-rose-200 rounded-full hover:bg-rose-50 transition-colors cursor-pointer"
          >
            Sign Out
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-8 py-12">

        {/* Profile Hero Card */}
        <div className="relative bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden mb-8">
          {/* Gradient banner */}
          <div className="h-32 bg-linear-to-r from-violet-600 via-purple-600 to-indigo-500" />

          <div className="px-8 pb-8">
            {/* Avatar overlapping banner */}
            <div className="flex items-end justify-between -mt-12 mb-6">
              <div
                className="w-24 h-24 rounded-2xl flex items-center justify-center text-white text-3xl font-black shadow-xl border-4 border-white"
                style={{ backgroundColor: avatarColor }}
              >
                {currentUser.avatar || currentUser.username?.charAt(0).toUpperCase()}
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-5 py-2.5 text-sm font-bold text-rose-600 border border-rose-200 bg-rose-50 hover:bg-rose-100 rounded-xl transition-colors cursor-pointer"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
                Sign Out
              </button>
            </div>

            <h1 className="text-2xl font-extrabold font-serif text-slate-900">{currentUser.username}</h1>
            <p className="text-sm text-slate-500 mt-0.5">{currentUser.email}</p>
            <div className="flex items-center gap-2 mt-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-violet-100 text-violet-700 text-xs font-bold rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-violet-500 animate-pulse inline-block"></span>
                Active Member
              </span>
              <span className="text-xs text-slate-400">· Member since {joinDate}</span>
            </div>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            { label: 'Groups Joined', value: totalGroups, icon: '👥', color: 'from-violet-50 to-purple-50 border-violet-100' },
            { label: 'Total Members Across Groups', value: totalMemberships, icon: '🤝', color: 'from-sky-50 to-blue-50 border-sky-100' },
            { label: 'Account Status', value: 'Verified', icon: '✅', color: 'from-emerald-50 to-green-50 border-emerald-100' },
          ].map((stat) => (
            <div key={stat.label} className={`bg-linear-to-br ${stat.color} border rounded-2xl p-5`}>
              <div className="text-2xl mb-2">{stat.icon}</div>
              <div className="text-2xl font-extrabold text-slate-800">{stat.value}</div>
              <div className="text-xs text-slate-500 font-semibold mt-0.5">{stat.label}</div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-8">

          {/* Account Info */}
          <div className="col-span-1">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100">
                <h2 className="text-sm font-extrabold text-slate-800 uppercase tracking-wide">Account Info</h2>
              </div>
              <div className="p-5 space-y-4">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Username</label>
                  <p className="text-sm font-semibold text-slate-700 mt-0.5">{currentUser.username}</p>
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Email</label>
                  <p className="text-sm font-semibold text-slate-700 mt-0.5 break-all">{currentUser.email}</p>
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">User ID</label>
                  <p className="text-sm font-mono font-semibold text-slate-500 mt-0.5">#{currentUser.id}</p>
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Role</label>
                  <p className="text-sm font-semibold text-slate-700 mt-0.5">Member</p>
                </div>
              </div>
            </div>
          </div>

          {/* Groups */}
          <div className="col-span-2">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                <h2 className="text-sm font-extrabold text-slate-800 uppercase tracking-wide">Your Groups</h2>
                <button
                  onClick={() => navigate('/groups')}
                  className="text-xs font-bold text-brand hover:underline cursor-pointer"
                >
                  Manage →
                </button>
              </div>
              <div className="p-5">
                {groups.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="text-4xl mb-3">👥</div>
                    <p className="text-sm font-semibold text-slate-500">No groups yet</p>
                    <button
                      onClick={() => navigate('/groups')}
                      className="mt-4 px-4 py-2 bg-brand text-white text-xs font-bold rounded-lg hover:bg-brand-dark transition-colors cursor-pointer"
                    >
                      Create or Join a Group
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {groups.map((g) => {
                      const activeMembers = (g.memberships || []).filter(m => !m.leftAt);
                      return (
                        <div
                          key={g.id}
                          onClick={() => navigate('/dashboard')}
                          className="flex items-center justify-between p-4 rounded-xl border border-slate-100 hover:border-brand/30 hover:bg-brand-light/50 transition-all cursor-pointer group"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-lg bg-linear-to-br from-violet-500 to-indigo-500 flex items-center justify-center text-white font-bold text-sm">
                              {g.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="text-sm font-bold text-slate-800 group-hover:text-brand">{g.name}</p>
                              <p className="text-xs text-slate-400">
                                {activeMembers.length} active member{activeMembers.length !== 1 ? 's' : ''}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="flex -space-x-2">
                              {activeMembers.slice(0, 3).map((m) => (
                                <div
                                  key={m.userId}
                                  className="w-6 h-6 rounded-full bg-brand text-white text-[10px] font-bold flex items-center justify-center border-2 border-white"
                                  title={m.username}
                                >
                                  {m.username?.charAt(0).toUpperCase()}
                                </div>
                              ))}
                              {activeMembers.length > 3 && (
                                <div className="w-6 h-6 rounded-full bg-slate-200 text-slate-600 text-[10px] font-bold flex items-center justify-center border-2 border-white">
                                  +{activeMembers.length - 3}
                                </div>
                              )}
                            </div>
                            <svg className="w-4 h-4 text-slate-300 group-hover:text-brand transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mt-4">
              <div className="px-5 py-4 border-b border-slate-100">
                <h2 className="text-sm font-extrabold text-slate-800 uppercase tracking-wide">Quick Actions</h2>
              </div>
              <div className="p-5 grid grid-cols-2 gap-3">
                {[
                  { label: 'Go to Dashboard', icon: '📊', path: '/dashboard', color: 'hover:bg-violet-50 hover:border-violet-200' },
                  { label: 'Manage Groups', icon: '👥', path: '/groups', color: 'hover:bg-sky-50 hover:border-sky-200' },
                  { label: 'Import CSV', icon: '📂', path: '/import', color: 'hover:bg-emerald-50 hover:border-emerald-200' },
                  { label: 'Sign Out', icon: '🚪', action: handleLogout, color: 'hover:bg-rose-50 hover:border-rose-200' },
                ].map((item) => (
                  <button
                    key={item.label}
                    onClick={item.action || (() => navigate(item.path))}
                    className={`flex items-center gap-3 p-3 rounded-xl border border-slate-200 transition-all cursor-pointer text-left ${item.color}`}
                  >
                    <span className="text-xl">{item.icon}</span>
                    <span className="text-sm font-semibold text-slate-700">{item.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Profile;
