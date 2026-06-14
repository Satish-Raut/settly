import { createSlice } from '@reduxjs/toolkit';

const defaultMemberships = [
  { userId: 1, joinedAt: '2026-02-01T00:00:00.000Z', leftAt: null }, // Aisha
  { userId: 2, joinedAt: '2026-02-01T00:00:00.000Z', leftAt: null }, // Rohan
  { userId: 3, joinedAt: '2026-02-01T00:00:00.000Z', leftAt: null }, // Priya
  { userId: 4, joinedAt: '2026-02-01T00:00:00.000Z', leftAt: '2026-03-29T23:59:59.999Z' }, // Meera
  { userId: 5, joinedAt: '2026-04-10T00:00:00.000Z', leftAt: null }, // Sam
  { userId: 6, joinedAt: '2026-03-08T00:00:00.000Z', leftAt: '2026-03-15T23:59:59.999Z' }, // Dev
];

const initialGroups = [
  {
    id: 1,
    name: 'Flat 404 & Goa Trip',
    createdAt: '2026-02-01T00:00:00.000Z',
    memberships: defaultMemberships,
  }
];

const groupsSlice = createSlice({
  name: 'groups',
  initialState: {
    groups: initialGroups,
    selectedGroupId: 1,
    loading: false,
    error: null,
  },
  reducers: {
    createGroup: (state, action) => {
      const { name, members } = action.payload; // members is array of { userId, joinedAt, leftAt }
      const newGroup = {
        id: state.groups.length + 1,
        name,
        createdAt: new Date().toISOString(),
        memberships: members.map(m => ({
          userId: m.userId,
          joinedAt: m.joinedAt || new Date().toISOString(),
          leftAt: m.leftAt || null,
        })),
      };
      state.groups.push(newGroup);
      state.selectedGroupId = newGroup.id;
    },
    updateMembership: (state, action) => {
      const { groupId, userId, joinedAt, leftAt } = action.payload;
      const group = state.groups.find(g => g.id === groupId);
      if (group) {
        const membership = group.memberships.find(m => m.userId === userId);
        if (membership) {
          membership.joinedAt = joinedAt;
          membership.leftAt = leftAt;
        } else {
          group.memberships.push({ userId, joinedAt, leftAt });
        }
      }
    },
    addMemberToGroup: (state, action) => {
      const { groupId, userId, joinedAt } = action.payload;
      const group = state.groups.find(g => g.id === groupId);
      if (group) {
        const existing = group.memberships.find(m => m.userId === userId);
        if (existing) {
          existing.joinedAt = joinedAt;
          existing.leftAt = null; // Re-active
        } else {
          group.memberships.push({ userId, joinedAt, leftAt: null });
        }
      }
    },
    removeMemberFromGroup: (state, action) => {
      const { groupId, userId, leftAt } = action.payload;
      const group = state.groups.find(g => g.id === groupId);
      if (group) {
        const membership = group.memberships.find(m => m.userId === userId);
        if (membership) {
          membership.leftAt = leftAt;
        }
      }
    },
    selectGroup: (state, action) => {
      state.selectedGroupId = action.payload;
    }
  }
});

export const { createGroup, updateMembership, addMemberToGroup, removeMemberFromGroup, selectGroup } = groupsSlice.actions;
export default groupsSlice.reducer;
