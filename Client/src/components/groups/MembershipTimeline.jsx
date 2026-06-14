import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { addMemberToGroup, removeMemberFromGroup } from '../../store/slices/groupsSlice';

const MembershipTimeline = ({ groupId }) => {
  const dispatch = useDispatch();
  const group = useSelector(state => state.groups.groups.find(g => g.id === groupId));
  const users = useSelector(state => state.auth.users);
  
  const [newUserId, setNewUserId] = useState('');
  const [joinedDate, setJoinedDate] = useState('2026-04-10');
  const [leaveDate, setLeaveDate] = useState('2026-03-29');
  const [activeRemoveUserId, setActiveRemoveUserId] = useState('');

  if (!group) return <div>Group not found</div>;

  const handleAddMember = (e) => {
    e.preventDefault();
    if (!newUserId) return;
    dispatch(addMemberToGroup({
      groupId,
      userId: parseInt(newUserId),
      joinedAt: new Date(joinedDate).toISOString(),
    }));
    setNewUserId('');
  };

  const handleRemoveMember = (e) => {
    e.preventDefault();
    if (!activeRemoveUserId) return;
    dispatch(removeMemberFromGroup({
      groupId,
      userId: parseInt(activeRemoveUserId),
      leftAt: new Date(leaveDate).toISOString(),
    }));
    setActiveRemoveUserId('');
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs font-sans">
      <h3 className="text-lg font-bold font-serif text-slate-800 mb-4">Membership Timeline</h3>
      <p className="text-xs text-slate-500 mb-6">
        View when each flatmate joined or left. Note: Expense calculations are strictly date-scoped.
      </p>

      {/* Timeline Visualizer */}
      <div className="space-y-4 mb-8">
        {group.memberships.map((membership) => {
          const user = users.find(u => u.id === membership.userId);
          const joinedStr = new Date(membership.joinedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
          const leftStr = membership.leftAt 
            ? new Date(membership.leftAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
            : 'Present (Active)';
          const isActive = !membership.leftAt;

          return (
            <div key={membership.userId} className="flex items-start gap-4">
              <div className="flex flex-col items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm text-white ${isActive ? 'bg-brand shadow-md shadow-brand/20' : 'bg-slate-400'}`}>
                  {user?.avatar || 'U'}
                </div>
                <div className="w-0.5 h-10 bg-slate-200 last:hidden"></div>
              </div>
              <div className="flex-1 bg-slate-50 border border-slate-100 rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800 text-sm">{user?.username}</span>
                  <span className={`px-2 py-0.5 text-[9px] font-bold rounded-full uppercase ${isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                    {isActive ? 'Active' : 'Left'}
                  </span>
                </div>
                <div className="mt-1 text-xs text-slate-500 flex justify-between">
                  <span>Joined: {joinedStr}</span>
                  {membership.leftAt && <span className="text-rose-500 font-semibold">Left: {leftStr}</span>}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Forms to Manage memberships */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-slate-100">
        {/* Add Member Form */}
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Add Member / Set Join Date</h4>
          <form onSubmit={handleAddMember} className="space-y-3">
            <div>
              <select
                value={newUserId}
                onChange={(e) => setNewUserId(e.target.value)}
                className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 bg-white focus:ring-brand"
              >
                <option value="">Select User</option>
                {users
                  .filter(u => !group.memberships.some(m => m.userId === u.id))
                  .map(u => (
                    <option key={u.id} value={u.id}>{u.username}</option>
                  ))
                }
              </select>
            </div>
            <div>
              <input
                type="date"
                value={joinedDate}
                onChange={(e) => setJoinedDate(e.target.value)}
                className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2"
              />
            </div>
            <button
              type="submit"
              disabled={!newUserId}
              className="w-full py-2 bg-brand text-white rounded-lg text-xs font-bold hover:bg-brand-dark transition-colors disabled:bg-slate-100 disabled:text-slate-400 cursor-pointer"
            >
              Add Member
            </button>
          </form>
        </div>

        {/* Remove Member / Record Left Date */}
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Remove Member / Set Left Date</h4>
          <form onSubmit={handleRemoveMember} className="space-y-3">
            <div>
              <select
                value={activeRemoveUserId}
                onChange={(e) => setActiveRemoveUserId(e.target.value)}
                className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 bg-white focus:ring-brand"
              >
                <option value="">Select Member</option>
                {group.memberships
                  .filter(m => !m.leftAt)
                  .map(m => {
                    const u = users.find(user => user.id === m.userId);
                    return <option key={m.userId} value={m.userId}>{u?.username}</option>;
                  })
                }
              </select>
            </div>
            <div>
              <input
                type="date"
                value={leaveDate}
                onChange={(e) => setLeaveDate(e.target.value)}
                className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2"
              />
            </div>
            <button
              type="submit"
              disabled={!activeRemoveUserId}
              className="w-full py-2 bg-rose-500 text-white rounded-lg text-xs font-bold hover:bg-rose-600 transition-colors disabled:bg-slate-100 disabled:text-slate-400 cursor-pointer"
            >
              Set Left Date
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default MembershipTimeline;
