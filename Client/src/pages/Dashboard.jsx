import React, { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { logout } from '../store/slices/authSlice';
import { selectBalancesForGroup, selectExpensesForGroup, deleteExpense, addSettlement, fetchExpenses, fetchBalances } from '../store/slices/expensesSlice';
import MembershipTimeline from '../components/groups/MembershipTimeline';
import AddExpenseForm from '../components/expenses/AddExpenseForm';
import AuditTrailDetail from '../components/expenses/AuditTrailDetail';
import { useNavigate } from 'react-router-dom';

const Dashboard = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { currentUser, isAuthenticated } = useSelector((state) => state.auth);
  const selectedGroupId = useSelector((state) => state.groups.selectedGroupId);
  const groupsList = useSelector((state) => state.groups.groups);
  const groupsLoading = useSelector((state) => state.groups.loading);
  const group = useSelector(state => state.groups.groups.find(g => g.id === selectedGroupId));
  const expenses = useSelector(state => selectExpensesForGroup(state, selectedGroupId));

  const [activeTab, setActiveTab] = useState('ledger'); // 'ledger' | 'timeline'
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [selectedAuditId, setSelectedAuditId] = useState(null);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  
  // Settlement dialog inputs
  const [settleDebtData, setSettleDebtData] = useState(null); // { fromId, toId, amount, fromName, toName }
  const [settleDate, setSettleDate] = useState(new Date().toISOString().split('T')[0]);

  const { netBalances, simplifiedDebts, auditTrails } = useSelector((state) => 
    selectBalancesForGroup(state, selectedGroupId)
  );

  React.useEffect(() => {
    if (!groupsLoading && groupsList.length === 0) {
      navigate('/groups');
    }
  }, [groupsList, groupsLoading, navigate]);

  React.useEffect(() => {
    if (selectedGroupId) {
      dispatch(fetchExpenses(selectedGroupId));
      dispatch(fetchBalances(selectedGroupId));
    }
  }, [selectedGroupId, dispatch]);

  if (groupsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand mx-auto mb-4"></div>
          <p className="text-sm font-semibold text-slate-500">Loading roommate groups...</p>
        </div>
      </div>
    );
  }

  if (!group) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center p-8 bg-white border border-slate-200 rounded-2xl max-w-sm shadow-sm">
          <span className="text-4xl block mb-3">👥</span>
          <h3 className="text-base font-bold text-slate-700">No Group Selected</h3>
          <p className="text-xs text-slate-400 mt-1">Please select or create a group to view the dashboard.</p>
          <button
            onClick={() => navigate('/groups')}
            className="mt-4 px-4 py-2 bg-brand text-white text-xs font-bold rounded-lg hover:bg-brand-dark cursor-pointer"
          >
            Go to Groups
          </button>
        </div>
      </div>
    );
  }

  // Find current user's personal net balance
  const myNet = netBalances.find(b => b.userId === currentUser.id)?.netBalance || 0;

  const handleSettleDebtSubmit = (e) => {
    e.preventDefault();
    if (!settleDebtData) return;

    dispatch(addSettlement({
      groupId: selectedGroupId,
      payerId: settleDebtData.fromId,
      payeeId: settleDebtData.toId,
      amount: settleDebtData.amount,
      settlementDate: new Date(settleDate).toISOString()
    }));

    setSettleDebtData(null);
  };

  const selectedAuditTrail = auditTrails.find(a => a.expenseId === selectedAuditId);

  return (
    <div className="w-full bg-white text-slate-800 font-sans">
      
      {/* Header Bar */}
      <header className="w-full px-8 py-6 bg-white">
        <div className="max-w-7xl mx-auto w-full flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/')}>
            <span className="text-3xl font-extrabold text-brand tracking-tight font-serif">
              settly<span className="text-brand">.</span>
            </span>
          </div>
          
          {/* Navigations & Profile aligned to the right */}
          <div className="flex items-center gap-6 md:gap-10">
            <nav className="hidden md:flex items-center gap-4 text-sm font-semibold text-slate-500">
              <button onClick={() => navigate('/')} className="nav-item-glow cursor-pointer">Home</button>
              <button 
                onClick={() => {
                  navigate('/dashboard');
                  setActiveTab('ledger');
                }} 
                className={`nav-item-glow cursor-pointer ${activeTab === 'ledger' ? 'text-brand font-bold' : ''}`}
              >
                Dashboard
              </button>
              <button 
                onClick={() => {
                  navigate('/groups');
                }} 
                className="nav-item-glow cursor-pointer"
              >
                Groups
              </button>
              <button onClick={() => navigate('/import')} className="nav-item-glow cursor-pointer">CSV Importer</button>
            </nav>

            {/* Profile Dropdown */}
            <div className="flex items-center gap-4 relative">
              <div
                className="flex items-center gap-3 bg-brand-light border border-brand-light rounded-full py-1.5 pl-3 pr-2 cursor-pointer select-none"
                onClick={() => setShowProfileMenu(prev => !prev)}
              >
                <span className="text-xs font-bold text-brand-text">Hi, {currentUser.username}!</span>
                <div
                  className="w-8 h-8 rounded-full bg-brand text-white flex items-center justify-center font-bold shadow-md hover:bg-brand-dark transition-colors"
                  title="Profile & Settings"
                >
                  {currentUser.avatar}
                </div>
              </div>
              {showProfileMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowProfileMenu(false)} />
                  <div className="absolute right-0 top-12 w-44 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden">
                    <button
                      onClick={() => { setShowProfileMenu(false); navigate('/profile'); }}
                      className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-brand-light hover:text-brand transition-colors cursor-pointer"
                    >
                      <span>👤</span> View Profile
                    </button>
                    <div className="border-t border-slate-100" />
                    <button
                      onClick={() => { setShowProfileMenu(false); dispatch(logout()); navigate('/'); }}
                      className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm font-semibold text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                    >
                      <span>🚪</span> Sign Out
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-8 py-10">
        
        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* LEFT PANEL: Balances Summary & Simplified Debts */}
          <div className="lg:col-span-1 space-y-6">
            
            {/* Balance Widget Banner */}
            <div className={`p-6 rounded-2xl border shadow-sm ${myNet > 0 ? 'bg-emerald-50 border-emerald-100 text-emerald-900' : myNet < 0 ? 'bg-rose-50 border-rose-100 text-rose-900' : 'bg-slate-50 border-slate-200 text-slate-700'}`}>
              <span className="text-xs font-bold uppercase tracking-wider opacity-60 font-sans">Your Net Balance</span>
              <div className="mt-2 text-3xl font-extrabold font-serif">
                {myNet > 0 ? `Owed ₹${myNet.toLocaleString()}` : myNet < 0 ? `You owe ₹${Math.abs(myNet).toLocaleString()}` : 'You are all settled!'}
              </div>
              <p className="text-xs mt-1.5 opacity-70">
                {myNet > 0 ? 'People owe you money overall' : myNet < 0 ? 'You need to pay back your roommates' : 'No pending balances for you'}
              </p>
            </div>

            {/* Aisha's Simplified Debts List */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Aisha's Summary (Simplified Debts)</h3>
              
              {simplifiedDebts.length === 0 ? (
                <p className="text-sm text-slate-500 italic py-4">All roommate balances are perfectly settled!</p>
              ) : (
                <div className="space-y-3">
                  {simplifiedDebts.map((debt, index) => (
                    <div key={index} className="flex items-center justify-between border-b border-slate-100 pb-3 last:border-0 last:pb-0">
                      <div>
                        <span className="text-xs font-semibold text-slate-600 block">
                          <strong>{debt.fromName}</strong> owes <strong>{debt.toName}</strong>
                        </span>
                        <span className="text-lg font-extrabold text-slate-950 font-serif">₹{debt.amount.toLocaleString()}</span>
                      </div>
                      <button
                        onClick={() => setSettleDebtData(debt)}
                        className="px-3.5 py-1.5 text-xs font-bold text-brand border border-brand-light hover:border-brand rounded-lg hover:bg-brand-light transition-all shadow-xs cursor-pointer"
                      >
                        Settle
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Group Members List */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Roommate Net Balances</h3>
              <div className="space-y-3">
                {netBalances.map((item) => (
                  <div key={item.userId} className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-700">{item.username}</span>
                    <span className={`text-xs font-bold ${item.netBalance > 0 ? 'text-emerald-600' : item.netBalance < 0 ? 'text-rose-500' : 'text-slate-400'}`}>
                      {item.netBalance > 0 ? `+₹${item.netBalance.toLocaleString()}` : item.netBalance < 0 ? `-₹${Math.abs(item.netBalance).toLocaleString()}` : 'Settled'}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* CSV Import Shortcut */}
            <div className="bg-linear-to-r from-brand-dark to-slate-900 text-white rounded-2xl p-6 shadow-lg space-y-4">
              <div>
                <h4 className="font-bold text-sm text-brand-light">Ingest group spreadsheet</h4>
                <p className="text-xs text-brand-light/75 mt-1">Detect duplicate charges, ambiguous formatting, or temporal membership split overlaps.</p>
              </div>
              <button 
                onClick={() => navigate('/import')} 
                className="w-full py-2.5 bg-yellow-400 hover:bg-yellow-500 text-brand-dark text-xs font-bold rounded-lg transition-colors shadow-md shadow-brand/20 cursor-pointer"
              >
                Go to CSV Importer →
              </button>
            </div>

          </div>

          {/* RIGHT PANEL: Tab Switcher (Ledger vs Member Timelines) */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Tabs Selector Header */}
            <div className="flex justify-between items-center bg-white border border-slate-200 rounded-xl p-2 shadow-sm">
              <div className="flex gap-2">
                <button
                  onClick={() => setActiveTab('ledger')}
                  className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors cursor-pointer ${activeTab === 'ledger' ? 'bg-brand text-white' : 'text-slate-600 hover:bg-slate-50'}`}
                >
                  Expense Ledger
                </button>
                <button
                  onClick={() => setActiveTab('timeline')}
                  className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors cursor-pointer ${activeTab === 'timeline' ? 'bg-brand text-white' : 'text-slate-600 hover:bg-slate-50'}`}
                >
                  Membership Timeline
                </button>
              </div>

              {activeTab === 'ledger' && (
                <button
                  onClick={() => setShowAddExpense(true)}
                  className="px-4 py-2 bg-brand text-white text-xs font-bold rounded-lg hover:bg-brand-dark active:bg-brand-dark transition-colors shadow cursor-pointer"
                >
                  + Add Expense
                </button>
              )}
            </div>

            {/* Tab Body */}
            {activeTab === 'ledger' ? (
              <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
                <h3 className="text-lg font-bold font-serif text-slate-800 mb-4">Expenses Ledger</h3>
                
                {expenses.length === 0 && (
                  <p className="text-sm text-slate-500 italic text-center py-12 border-2 border-dashed border-slate-100 rounded-lg">
                    No expenses logged in this ledger yet. Upload a CSV or add an expense manually!
                  </p>
                )}

                <div className="space-y-4">
                  {auditTrails.map((trail) => {
                    const originalExp = expenses.find(e => e.id === trail.expenseId);
                    const isUSD = originalExp?.currency === 'USD';

                    return (
                      <div 
                        key={trail.expenseId} 
                        className="border border-slate-100 rounded-xl p-4 hover:shadow-md transition-all flex flex-col md:flex-row md:items-center md:justify-between gap-4 cursor-pointer bg-white"
                        onClick={() => setSelectedAuditId(trail.expenseId)}
                      >
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-800 text-sm hover:text-brand transition-colors font-serif">
                              {trail.description}
                            </span>
                            <span className="px-2 py-0.5 text-[9px] font-extrabold uppercase rounded bg-brand-light text-brand">
                              {trail.splitType}
                            </span>
                          </div>
                          
                          <div className="text-xs text-slate-500">
                            Paid by <strong className="text-slate-700 font-semibold">{trail.paidBy}</strong> on{' '}
                            {new Date(trail.date).toLocaleDateString()}
                          </div>
                          <div className="text-xs text-brand font-bold pt-1">
                            Click to verify split details (Rohan trace)
                          </div>
                        </div>

                        <div className="flex items-center gap-6 justify-between md:justify-end">
                          <div className="text-right">
                            <span className="font-bold font-serif text-slate-950 block text-sm">
                              {isUSD ? `$${trail.amount.toLocaleString()}` : `₹${trail.amount.toLocaleString()}`}
                            </span>
                            {isUSD && (
                              <span className="text-[10px] text-slate-400 font-bold block">
                                ≈ ₹{trail.amountInINR.toLocaleString()}
                              </span>
                            )}
                          </div>
                          
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              dispatch(deleteExpense(trail.expenseId));
                            }}
                            className="text-xs font-bold text-rose-500 hover:text-rose-700 px-2 py-1 rounded hover:bg-rose-50 transition-colors cursor-pointer"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <MembershipTimeline groupId={selectedGroupId} />
            )}

          </div>

        </div>

      </div>

      {/* Settle Debt Confirmation Modal */}
      {settleDebtData && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden">
            <div className="px-6 py-4 bg-brand-light border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-slate-800 text-sm font-serif">Record Settlement Payment</h3>
              <button onClick={() => setSettleDebtData(null)} className="text-slate-400 hover:text-slate-600 text-xl font-bold">×</button>
            </div>
            <form onSubmit={handleSettleDebtSubmit} className="p-6 space-y-4">
              <div className="bg-brand-light p-4 border border-brand-light rounded-xl text-xs leading-relaxed text-brand-text">
                You are recording a direct cash settlement payment:
                <div className="mt-2 text-sm text-slate-800 font-bold">
                  {settleDebtData.fromName} paid {settleDebtData.toName} ₹{settleDebtData.amount.toLocaleString()}
                </div>
              </div>
              
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Payment Date</label>
                <input
                  type="date"
                  value={settleDate}
                  onChange={(e) => setSettleDate(e.target.value)}
                  className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2"
                />
              </div>

              <div className="flex gap-2 justify-end pt-4">
                <button
                  type="button"
                  onClick={() => setSettleDebtData(null)}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-brand hover:bg-brand-dark text-white rounded-lg text-xs font-bold shadow"
                >
                  Record Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Manual Add Expense Form Modal */}
      {showAddExpense && (
        <AddExpenseForm 
          groupId={selectedGroupId} 
          onClose={() => setShowAddExpense(false)} 
        />
      )}

      {/* Audit Trail Details Modal (Rohan Trace) */}
      {selectedAuditTrail && (
        <AuditTrailDetail 
          auditTrail={selectedAuditTrail} 
          groupMemberships={group.memberships}
          onClose={() => setSelectedAuditId(null)}
        />
      )}

    </div>
  );
};

export default Dashboard;
