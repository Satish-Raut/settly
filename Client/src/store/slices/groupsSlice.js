import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { apiCall } from '../../lib/api';

// Async Thunks
export const fetchGroups = createAsyncThunk(
  'groups/fetchGroups',
  async (_, { rejectWithValue }) => {
    try {
      const data = await apiCall('/groups');
      return data; // array of groups with memberships
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

export const createNewGroup = createAsyncThunk(
  'groups/createNewGroup',
  async ({ name, members }, { rejectWithValue }) => {
    try {
      const data = await apiCall('/groups', {
        method: 'POST',
        body: { name, members }
      });
      return data; // created group
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

export const addMemberToGroup = createAsyncThunk(
  'groups/addMemberToGroup',
  async ({ groupId, userId, joinedAt }, { rejectWithValue }) => {
    try {
      const data = await apiCall(`/groups/${groupId}/members`, {
        method: 'POST',
        body: { userId, joinedAt }
      });
      return { groupId, member: data }; // { groupId, member: { userId, username, joinedAt, leftAt } }
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

export const removeMemberFromGroup = createAsyncThunk(
  'groups/removeMemberFromGroup',
  async ({ groupId, userId, leftAt }, { rejectWithValue }) => {
    try {
      const data = await apiCall(`/groups/${groupId}/members/${userId}`, {
        method: 'PATCH',
        body: { leftAt }
      });
      return { groupId, userId, member: data };
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

const groupsSlice = createSlice({
  name: 'groups',
  initialState: {
    groups: [],
    selectedGroupId: null,
    loading: false,
    error: null,
  },
  reducers: {
    selectGroup: (state, action) => {
      state.selectedGroupId = action.payload;
    }
  },
  extraReducers: (builder) => {
    builder
      // Fetch Groups
      .addCase(fetchGroups.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchGroups.fulfilled, (state, action) => {
        state.loading = false;
        state.groups = action.payload;
        // Auto-select first group if none is selected
        if (action.payload.length > 0 && !state.selectedGroupId) {
          state.selectedGroupId = action.payload[0].id;
        }
      })
      .addCase(fetchGroups.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Create Group
      .addCase(createNewGroup.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createNewGroup.fulfilled, (state, action) => {
        state.loading = false;
        state.groups.push(action.payload);
        state.selectedGroupId = action.payload.id;
      })
      .addCase(createNewGroup.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Add member
      .addCase(addMemberToGroup.fulfilled, (state, action) => {
        const { groupId, member } = action.payload;
        const group = state.groups.find(g => g.id === groupId);
        if (group) {
          const idx = group.memberships.findIndex(m => m.userId === member.userId);
          if (idx > -1) {
            group.memberships[idx] = member;
          } else {
            group.memberships.push(member);
          }
        }
      })
      // Remove member (soft-remove leftAt)
      .addCase(removeMemberFromGroup.fulfilled, (state, action) => {
        const { groupId, userId, member } = action.payload;
        const group = state.groups.find(g => g.id === groupId);
        if (group) {
          const idx = group.memberships.findIndex(m => m.userId === userId);
          if (idx > -1) {
            group.memberships[idx] = member;
          }
        }
      });
  }
});

export const { selectGroup } = groupsSlice.actions;
// Backward compatibility aliases
export const createGroup = ({ name, members }) => createNewGroup({ name, members });
export default groupsSlice.reducer;
