import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { apiCall } from '../../lib/api';

// Async Thunks
export const fetchExpenses = createAsyncThunk(
  'expenses/fetchExpenses',
  async (groupId, { rejectWithValue }) => {
    try {
      const data = await apiCall(`/groups/${groupId}/expenses`);
      return data; // formatted expenses array
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

export const fetchBalances = createAsyncThunk(
  'expenses/fetchBalances',
  async (groupId, { rejectWithValue }) => {
    try {
      const data = await apiCall(`/groups/${groupId}/balances`);
      return data; // { balanceMap, netBalances, simplifiedDebts, auditTrails }
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

export const createExpense = createAsyncThunk(
  'expenses/createExpense',
  async (expenseData, { dispatch, rejectWithValue }) => {
    try {
      const data = await apiCall('/expenses', {
        method: 'POST',
        body: expenseData
      });
      // Re-fetch balances to update summaries
      dispatch(fetchBalances(expenseData.groupId));
      return data; // created expense
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

export const removeExpense = createAsyncThunk(
  'expenses/removeExpense',
  async ({ expenseId, groupId }, { dispatch, rejectWithValue }) => {
    try {
      await apiCall(`/expenses/${expenseId}`, {
        method: 'DELETE'
      });
      // Re-fetch balances to update summaries
      dispatch(fetchBalances(groupId));
      return expenseId;
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

export const createSettlement = createAsyncThunk(
  'expenses/createSettlement',
  async (settlementData, { dispatch, rejectWithValue }) => {
    try {
      const data = await apiCall('/settlements', {
        method: 'POST',
        body: settlementData
      });
      // Re-fetch balances to update summaries
      dispatch(fetchBalances(settlementData.groupId));
      return data; // created settlement
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

const emptyBalances = {
  balanceMap: {},
  netBalances: [],
  simplifiedDebts: [],
  auditTrails: []
};

const expensesSlice = createSlice({
  name: 'expenses',
  initialState: {
    expenses: [],
    balances: emptyBalances,
    loading: false,
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      // Fetch Expenses
      .addCase(fetchExpenses.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchExpenses.fulfilled, (state, action) => {
        state.loading = false;
        state.expenses = action.payload;
      })
      .addCase(fetchExpenses.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Fetch Balances
      .addCase(fetchBalances.fulfilled, (state, action) => {
        state.balances = action.payload;
      })
      // Create Expense
      .addCase(createExpense.fulfilled, (state, action) => {
        state.expenses.push(action.payload);
      })
      // Delete Expense
      .addCase(removeExpense.fulfilled, (state, action) => {
        state.expenses = state.expenses.filter(e => e.id !== action.payload);
      });
  }
});

// Selectors for backwards compatibility
export const selectExpensesForGroup = (state, groupId) => {
  return state.expenses.expenses;
};

export const selectBalancesForGroup = (state, groupId) => {
  return state.expenses.balances || emptyBalances;
};

// Compatibility export actions (dispatched by views)
export const deleteExpense = (expenseId) => (dispatch, getState) => {
  const groupId = getState().groups.selectedGroupId;
  dispatch(removeExpense({ expenseId, groupId }));
};

export const addExpense = (expenseData) => (dispatch) => {
  dispatch(createExpense(expenseData));
};

export const addSettlement = (settlementData) => (dispatch) => {
  dispatch(createSettlement(settlementData));
};

export const bulkAddExpenses = ({ expenses, settlements }) => (dispatch, getState) => {
  // Mock action used on finalize import: since backend finalize imports all in one API transaction,
  // we do not need bulkAddExpenses locally. We will trigger fetchExpenses and fetchBalances instead.
  const groupId = getState().groups.selectedGroupId;
  dispatch(fetchExpenses(groupId));
  dispatch(fetchBalances(groupId));
};

export default expensesSlice.reducer;
