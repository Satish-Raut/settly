import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { apiCall } from '../../lib/api';
import { bulkAddExpenses } from './expensesSlice';

// Async Thunks
export const uploadCSVFile = createAsyncThunk(
  'import/uploadCSVFile',
  async ({ file, groupId }, { rejectWithValue }) => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('groupId', groupId);

      const data = await apiCall('/import/csv', {
        method: 'POST',
        body: formData
      });
      return data; // { importSession, stagedExpenses, anomalies }
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

export const finalizeStagedImport = createAsyncThunk(
  'import/finalizeStagedImport',
  async ({ importId, resolutions }, { dispatch, rejectWithValue }) => {
    try {
      const data = await apiCall(`/import/${importId}/finalize`, {
        method: 'POST',
        body: { resolutions }
      });
      
      // Refresh expenses and balances in store
      dispatch(bulkAddExpenses({}));
      
      return data; // { success, importSessionId, status, savedCount, skippedCount, report }
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

const importSlice = createSlice({
  name: 'import',
  initialState: {
    importSession: null,
    stagedExpenses: [],
    anomalies: [],
    isParsed: false,
    historyReports: [],
    loading: false,
    error: null,
  },
  reducers: {
    resolveAnomaly: (state, action) => {
      const { anomalyId, resolutionAction, updatedStagedRow } = action.payload;
      
      const anomalyIndex = state.anomalies.findIndex(a => a.id === anomalyId);
      if (anomalyIndex !== -1) {
        state.anomalies[anomalyIndex].isResolved = true;
        state.anomalies[anomalyIndex].resolutionAction = resolutionAction;
        
        const stagedId = state.anomalies[anomalyIndex].stagedExpenseId;
        const stagedIndex = state.stagedExpenses.findIndex(s => s.id === stagedId);
        if (stagedIndex !== -1 && updatedStagedRow) {
          state.stagedExpenses[stagedIndex] = {
            ...state.stagedExpenses[stagedIndex],
            ...updatedStagedRow,
          };
        }
      }
    },
    excludeStagedRow: (state, action) => {
      const stagedId = action.payload;
      const index = state.stagedExpenses.findIndex(s => s.id === stagedId);
      if (index !== -1) {
        state.stagedExpenses[index].isExcluded = true;
        
        // Resolve all anomalies of this row as Excluded
        state.anomalies.forEach(a => {
          if (a.stagedExpenseId === stagedId) {
            a.isResolved = true;
            a.resolutionAction = 'Row Excluded/Skipped';
          }
        });
      }
    },
    cancelImport: (state) => {
      state.importSession = null;
      state.stagedExpenses = [];
      state.anomalies = [];
      state.isParsed = false;
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    builder
      // Upload CSV
      .addCase(uploadCSVFile.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.isParsed = false;
      })
      .addCase(uploadCSVFile.fulfilled, (state, action) => {
        state.loading = false;
        state.isParsed = true;
        state.importSession = action.payload.importSession;
        state.stagedExpenses = action.payload.stagedExpenses.map(item => ({
          ...item,
          isExcluded: false // Add default excluded flag local state
        }));
        
        // Map backend anomalies to format expected by UI
        state.anomalies = action.payload.anomalies.map(an => ({
          id: an.id,
          rowNumber: an.rowNumber,
          stagedExpenseId: an.stagedExpenseId,
          type: an.anomalyType,
          severity: an.severity,
          description: an.description,
          isResolved: an.isResolved,
          resolutionAction: an.resolutionAction
        }));
      })
      .addCase(uploadCSVFile.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.isParsed = false;
      })
      // Finalize Import
      .addCase(finalizeStagedImport.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(finalizeStagedImport.fulfilled, (state, action) => {
        state.loading = false;
        state.isParsed = false;
        state.importSession = null;
        state.stagedExpenses = [];
        state.anomalies = [];
        
        // Push report metadata to history reports logs
        state.historyReports.push({
          importId: action.payload.importSessionId,
          filename: action.payload.filename || 'import',
          importedAt: new Date().toISOString(),
          totalRows: action.payload.savedCount + action.payload.skippedCount,
          importedRows: action.payload.savedCount,
          excludedRows: action.payload.skippedCount,
          report: action.payload.report
        });
      })
      .addCase(finalizeStagedImport.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  }
});

export const { resolveAnomaly, excludeStagedRow, cancelImport } = importSlice.actions;
export default importSlice.reducer;
