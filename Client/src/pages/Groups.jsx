import React, { useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { createGroup, selectGroup } from "../store/slices/groupsSlice";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";

const Groups = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  
  const { currentUser, isAuthenticated, users } = useSelector((state) => state.auth);
  const groupsList = useSelector((state) => state.groups.groups);
  
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [selectedMemberIds, setSelectedMemberIds] = useState([]);
  const [memberJoinDates, setMemberJoinDates] = useState({}); // { [userId]: 'YYYY-MM-DD' }
  const [errorMsg, setErrorMsg] = useState("");

  if (!currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand mx-auto mb-4"></div>
          <p className="text-sm font-semibold text-slate-500">Retrieving user profile...</p>
        </div>
      </div>
    );
  }

  console.log("Groups render: currentUser =", currentUser, "users =", users);

  const handleOpenCreateModal = () => {
    console.log("handleOpenCreateModal clicked!");
    try {
      setNewGroupName("");
      setSelectedMemberIds([currentUser.id]); // creator is auto-added
      setMemberJoinDates({
        [currentUser.id]: new Date().toISOString().split("T")[0]
      });
      setErrorMsg("");
      setShowCreateModal(true);
      console.log("showCreateModal set to true");
    } catch (e) {
      console.error("Error in handleOpenCreateModal:", e);
    }
  };

  const handleToggleMember = (userId) => {
    if (userId === currentUser.id) return; // creator cannot be unselected
    
    if (selectedMemberIds.includes(userId)) {
      setSelectedMemberIds(selectedMemberIds.filter((id) => id !== userId));
      const updatedDates = { ...memberJoinDates };
      delete updatedDates[userId];
      setMemberJoinDates(updatedDates);
    } else {
      setSelectedMemberIds([...selectedMemberIds, userId]);
      setMemberJoinDates({
        ...memberJoinDates,
        [userId]: new Date().toISOString().split("T")[0]
      });
    }
  };

  const handleJoinDateChange = (userId, dateVal) => {
    setMemberJoinDates({
      ...memberJoinDates,
      [userId]: dateVal
    });
  };

  const handleCreateGroupSubmit = (e) => {
    e.preventDefault();
    if (!newGroupName.trim()) {
      setErrorMsg("Group name is required");
      return;
    }

    const membersPayload = selectedMemberIds.map((uid) => ({
      userId: uid,
      joinedAt: new Date(memberJoinDates[uid] || new Date()).toISOString()
    }));

    dispatch(
      createGroup({
        name: newGroupName.trim(),
        members: membersPayload
      })
    );

    setShowCreateModal(false);
    navigate("/dashboard");
  };

  const handleSelectGroupCard = (groupId) => {
    dispatch(selectGroup(groupId));
    navigate("/dashboard");
  };

  return (
    <div className="w-full bg-white text-slate-800 font-sans selection:bg-brand-light min-h-screen">
      <Navbar />

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-8 py-12">
        <div className="flex items-center justify-between mb-10">
          <div>
            <h2 className="text-3xl font-extrabold font-serif text-slate-900 tracking-tight">Your Groups</h2>
            <p className="text-sm text-slate-500 mt-1">Manage memberships, add new roommates, and explore ledger sections.</p>
          </div>
          
          <button
            onClick={handleOpenCreateModal}
            className="px-5 py-2.5 bg-brand hover:bg-brand-dark text-white text-xs font-bold rounded-lg transition-colors shadow-md shadow-brand/20 cursor-pointer"
          >
            + Create New Group
          </button>
        </div>

        {/* Groups Cards Grid */}
        {groupsList.length === 0 ? (
          <div className="text-center py-20 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50">
            <span className="text-4xl block mb-3">👥</span>
            <h3 className="text-base font-bold text-slate-700">No Groups Found</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">Create a group to start tracking splits, balances, and shared ledgers.</p>
            <button
              onClick={handleOpenCreateModal}
              className="mt-4 px-4 py-2 bg-brand text-white text-xs font-bold rounded-lg hover:bg-brand-dark cursor-pointer"
            >
              Create Group Now
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {groupsList.map((g) => {
              // Get lists of active members
              const activeMembers = g.memberships.filter(m => !m.leftAt);
              const pastMembers = g.memberships.filter(m => m.leftAt);

              return (
                <div
                  key={g.id}
                  onClick={() => handleSelectGroupCard(g.id)}
                  className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs hover:shadow-md hover:border-brand/40 transition-all cursor-pointer flex flex-col justify-between group"
                >
                  <div className="space-y-4">
                    <div className="flex items-start justify-between">
                      <h3 className="font-extrabold text-lg text-slate-800 group-hover:text-brand transition-colors font-serif leading-tight">
                        {g.name}
                      </h3>
                      <span className="text-[9px] uppercase tracking-wider bg-brand-light text-brand px-2.5 py-1 rounded-full font-bold">
                        ID: {g.id}
                      </span>
                    </div>

                    {/* Timeline summary */}
                    <div className="space-y-2">
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Active Members ({activeMembers.length})</span>
                        <div className="flex flex-wrap gap-1.5 mt-1.5">
                          {activeMembers.map(m => {
                            const u = users.find(user => user.id === m.userId);
                            return (
                              <span
                                key={m.userId}
                                className="px-2 py-0.5 text-xs rounded-md bg-slate-50 border border-slate-150 text-slate-700 font-semibold"
                                title={`Joined: ${new Date(m.joinedAt).toLocaleDateString()}`}
                              >
                                {u?.username || `User ${m.userId}`}
                              </span>
                            );
                          })}
                        </div>
                      </div>

                      {pastMembers.length > 0 && (
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Left Members ({pastMembers.length})</span>
                          <div className="flex flex-wrap gap-1.5 mt-1.5">
                            {pastMembers.map(m => {
                              const u = users.find(user => user.id === m.userId);
                              return (
                                <span
                                  key={m.userId}
                                  className="px-2 py-0.5 text-xs rounded-md bg-rose-50 border border-rose-100 text-rose-500 line-through font-semibold"
                                  title={`Left: ${new Date(m.leftAt).toLocaleDateString()}`}
                                >
                                  {u?.username || `User ${m.userId}`}
                                </span>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mt-8 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400 font-medium">
                    <span>Created: {new Date(g.createdAt).toLocaleDateString()}</span>
                    <span className="text-brand font-bold group-hover:translate-x-0.5 transition-transform inline-flex items-center gap-1">
                      Open Ledger →
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Create Group Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
            <div className="px-6 py-4 bg-brand-light border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-slate-800 text-sm font-serif">Create New Roommate Group</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-slate-600 text-xl font-bold">×</button>
            </div>
            
            <form onSubmit={handleCreateGroupSubmit} className="p-6 space-y-4">
              {errorMsg && (
                <div className="bg-rose-50 text-rose-700 text-xs font-semibold p-3 rounded-lg border border-rose-100">
                  {errorMsg}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Group Name</label>
                <input
                  type="text"
                  placeholder="e.g. Flat 404, Goa Vacation, etc."
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:border-brand"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Select Members & Set Join Dates</label>
                <div className="border border-slate-200 rounded-lg max-h-48 overflow-y-auto divide-y divide-slate-100">
                  {users.map((u) => {
                    const isSelected = selectedMemberIds.includes(u.id);
                    const isSelf = u.id === currentUser.id;

                    return (
                      <div key={u.id} className="p-3 flex flex-col gap-2 bg-white hover:bg-slate-50 transition-colors">
                        <div className="flex items-center justify-between">
                          <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              disabled={isSelf} // Creator is always added
                              onChange={() => handleToggleMember(u.id)}
                              className="rounded text-brand"
                            />
                            {u.username} {isSelf && <span className="text-[10px] text-brand font-bold font-sans">(You)</span>}
                          </label>
                          <span className="text-[10px] text-slate-400">{u.email}</span>
                        </div>

                        {isSelected && (
                          <div className="pl-6 flex items-center justify-between gap-4">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Join Date:</span>
                            <input
                              type="date"
                              value={memberJoinDates[u.id] || ""}
                              onChange={(e) => handleJoinDateChange(u.id, e.target.value)}
                              className="text-[10px] border border-slate-350 rounded px-2 py-0.5 bg-white text-slate-700"
                              required
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex gap-2 justify-end pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-brand hover:bg-brand-dark text-white rounded-lg text-xs font-bold shadow cursor-pointer"
                >
                  Create Group
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Groups;
