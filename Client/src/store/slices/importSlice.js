import { createSlice } from '@reduxjs/toolkit';

// Names mapping helpers for fuzzy matches
const userAliases = {
  'aisha': 1,
  'rohan': 2,
  'rohan ': 2,
  'rohan': 2,
  'priya': 3,
  'priya s': 3,
  'meera': 4,
  'sam': 5,
  'dev': 6,
  'dev\'s friend kabir': null, // Unknown/guest user
};

const resolveName = (nameStr) => {
  if (!nameStr) return null;
  const normalized = nameStr.trim().toLowerCase();
  return userAliases[normalized] !== undefined ? userAliases[normalized] : null;
};

// Custom CSV Line parser to handle quoted items (e.g. "1,200")
const parseCSVLine = (line) => {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
};

// Date normalizer and format checker
// Converts "01-02-2026" or "Mar-14" to ISO Date string
const parseAndNormalizeDate = (dateStr) => {
  if (!dateStr) return { date: null, format: 'missing', isAmbiguous: false };
  const str = dateStr.trim();

  // Check pattern "Mar-14"
  const mar14Regex = /^([a-zA-Z]+)-(\d+)$/;
  const mar14Match = str.match(mar14Regex);
  if (mar14Match) {
    const monthStr = mar14Match[1].toLowerCase();
    const day = parseInt(mar14Match[2]);
    let month = 2; // Default to March (2 in JS Date 0-indexed)
    if (monthStr.startsWith('jan')) month = 0;
    else if (monthStr.startsWith('feb')) month = 1;
    else if (monthStr.startsWith('mar')) month = 2;
    else if (monthStr.startsWith('apr')) month = 3;
    else if (monthStr.startsWith('may')) month = 4;
    // Map to 2026 based on project context
    const parsedDate = new Date(Date.UTC(2026, month, day, 12, 0, 0));
    return { date: parsedDate.toISOString(), format: 'MMM-DD', isAmbiguous: false };
  }

  // Check pattern DD-MM-YYYY or MM-DD-YYYY (ambiguous dates check)
  const dmyRegex = /^(\d{2})-(\d{2})-(\d{4})$/;
  const dmyMatch = str.match(dmyRegex);
  if (dmyMatch) {
    const val1 = parseInt(dmyMatch[1]);
    const val2 = parseInt(dmyMatch[2]);
    const year = parseInt(dmyMatch[3]);

    // If both are <= 12, it is ambiguous (e.g. 04-05-2026)
    const isAmbiguous = (val1 <= 12 && val2 <= 12 && val1 !== val2);
    
    // Default system resolution: interpret as DD-MM-YYYY
    const day = val1;
    const month = val2 - 1; // 0-indexed
    const parsedDate = new Date(Date.UTC(year, month, day, 12, 0, 0));
    return { 
      date: parsedDate.toISOString(), 
      format: 'DD-MM-YYYY', 
      isAmbiguous,
      originalParts: { val1, val2, year }
    };
  }

  const parsed = new Date(str);
  return { 
    date: isNaN(parsed.getTime()) ? null : parsed.toISOString(), 
    format: 'standard', 
    isAmbiguous: false 
  };
};

const importSlice = createSlice({
  name: 'import',
  initialState: {
    importSession: null, // { id, filename, status: 'PENDING' | 'COMPLETED' }
    stagedExpenses: [],  // parsed CSV rows with active resolutions
    anomalies: [],       // list of anomalies found: { id, rowNumber, stagedExpenseId, type, severity, description, isResolved, resolutionAction }
    isParsed: false,
    historyReports: [],  // import logs completed
    loading: false,
    error: null,
  },
  reducers: {
    startParsing: (state) => {
      state.loading = true;
      state.error = null;
    },
    parseCSVSuccess: (state, action) => {
      const { filename, csvText, memberships } = action.payload;
      state.loading = false;
      state.stagedExpenses = [];
      state.anomalies = [];
      state.isParsed = true;
      state.importSession = {
        id: Date.now(),
        filename,
        status: 'PENDING',
      };

      const lines = csvText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
      if (lines.length <= 1) {
        state.error = 'CSV file has no data rows';
        state.isParsed = false;
        return;
      }

      // Read header to get columns
      const headers = parseCSVLine(lines[0]);
      
      const rows = [];
      // Parse data rows
      for (let i = 1; i < lines.length; i++) {
        const values = parseCSVLine(lines[i]);
        if (values.length < headers.length) continue;

        const row = {};
        headers.forEach((h, idx) => {
          row[h.toLowerCase().trim()] = values[idx] || '';
        });
        row.rowNumber = i + 1;
        rows.push(row);
      }

      // Keep cache of processed rows for duplicate checking
      const parsedRows = [];

      rows.forEach(row => {
        const rowNum = row.rowNumber;
        let hasAnomaly = false;
        const rowAnomalies = [];

        // 1. Check Missing Critical Fields
        const hasMissingCrit = !row.date || !row.description || !row.amount;
        if (hasMissingCrit) {
          rowAnomalies.push({
            type: 'MISSING_DATA',
            severity: 'ERROR',
            description: `Row ${rowNum} is missing critical fields (Date, Description, or Amount).`,
          });
          hasAnomaly = true;
        }

        // 2. Check Negative Amounts (Refund Logic)
        let amountVal = parseFloat((row.amount || '0').replace(/,/g, ''));
        const isNegative = amountVal < 0;
        if (isNegative) {
          rowAnomalies.push({
            type: 'NEGATIVE_AMOUNT',
            severity: 'WARNING',
            description: `Row ${rowNum} has a negative amount (${row.amount}). Ingesting as a group refund.`,
          });
          hasAnomaly = true;
        }

        // 3. Date Parsing & Formatting
        const dateResult = parseAndNormalizeDate(row.date);
        if (!dateResult.date) {
          rowAnomalies.push({
            type: 'INVALID_DATE',
            severity: 'ERROR',
            description: `Row ${rowNum} has an invalid or unparseable date format: "${row.date}".`,
          });
          hasAnomaly = true;
        } else {
          if (dateResult.format === 'MMM-DD') {
            rowAnomalies.push({
              type: 'DATE_FORMAT_MISMATCH',
              severity: 'WARNING',
              description: `Row ${rowNum} uses an abbreviated date format ("${row.date}"). Normalized to "${new Date(dateResult.date).toLocaleDateString()}".`,
            });
            hasAnomaly = true;
          }
          if (dateResult.isAmbiguous) {
            rowAnomalies.push({
              type: 'AMBIGUOUS_DATE',
              severity: 'WARNING',
              description: `Row ${rowNum} date "${row.date}" is ambiguous. DD-MM-YYYY format will be assumed unless specified otherwise.`,
            });
            hasAnomaly = true;
          }
        }

        // 4. Missing Currency Warning
        const currencyStr = (row.currency || '').trim().toUpperCase();
        const hasNoCurrency = !currencyStr;
        if (hasNoCurrency) {
          rowAnomalies.push({
            type: 'MISSING_CURRENCY',
            severity: 'WARNING',
            description: `Row ${rowNum} has no currency specified. Defaulting to INR.`,
          });
          hasAnomaly = true;
        }

        // 5. Missing Payer Error
        const paidByName = (row.paid_by || '').trim();
        const hasNoPayer = !paidByName;
        let payerId = null;
        if (hasNoPayer) {
          rowAnomalies.push({
            type: 'MISSING_PAYER',
            severity: 'ERROR',
            description: `Row ${rowNum} is missing the payer's name. A valid group member must be assigned.`,
          });
          hasAnomaly = true;
        } else {
          payerId = resolveName(paidByName);
          // Check if resolved or alias warning
          if (payerId === null) {
            rowAnomalies.push({
              type: 'INVALID_PAYER',
              severity: 'ERROR',
              description: `Row ${rowNum} payer "${paidByName}" is not recognized as a registered group member.`,
            });
            hasAnomaly = true;
          } else {
            const originalNormalized = paidByName.toLowerCase();
            const expectedName = memberships.find(m => m.userId === payerId);
            if (paidByName !== 'Aisha' && paidByName !== 'Rohan' && paidByName !== 'Priya' && paidByName !== 'Meera' && paidByName !== 'Sam' && paidByName !== 'Dev') {
              rowAnomalies.push({
                type: 'USER_NAME_ALIAS',
                severity: 'WARNING',
                description: `Row ${rowNum} payer name "${paidByName}" was normalized to registered user account.`,
              });
              hasAnomaly = true;
            }
          }
        }

        // 6. Duplicate checking (Matches date, description, paid_by and amount)
        const duplicate = parsedRows.find(pr => 
          pr.date === row.date && 
          pr.paid_by.toLowerCase().trim() === row.paid_by.toLowerCase().trim() && 
          Math.abs(parseFloat(pr.amount.replace(/,/g, '')) - parseFloat(row.amount.replace(/,/g, ''))) < 0.01
        );

        if (duplicate) {
          // Check description similarity or identical values
          const isIdentical = duplicate.description.toLowerCase().trim() === row.description.toLowerCase().trim();
          if (isIdentical) {
            rowAnomalies.push({
              type: 'DUPLICATE_ROW',
              severity: 'WARNING',
              description: `Row ${rowNum} is a exact duplicate of Row ${duplicate.rowNum} ("${row.description}", ${row.amount}).`,
              duplicateOfRow: duplicate.rowNum
            });
          } else {
            rowAnomalies.push({
              type: 'CONFLICTING_DUPLICATE',
              severity: 'WARNING',
              description: `Row ${rowNum} matches Row ${duplicate.rowNum} by date, payer, and amount, but has conflicting details: "${row.description}" vs "${duplicate.description}".`,
              duplicateOfRow: duplicate.rowNum
            });
          }
          hasAnomaly = true;
        }

        // 7. Settlement check
        const isSettlement = row.description.toLowerCase().includes('paid back') || 
                            row.description.toLowerCase().includes('deposit') || 
                            row.description.toLowerCase().includes('settlement');
        if (isSettlement) {
          rowAnomalies.push({
            type: 'SETTLEMENT_CLASSIFICATION',
            severity: 'WARNING',
            description: `Row ${rowNum} ("${row.description}") detected as a direct payment/settlement. Re-classifying this row in accounts.`,
          });
          hasAnomaly = true;
        }

        // 8. Precision check (3 decimals)
        const rawAmountStr = (row.amount || '').replace(/,/g, '');
        const decSplit = rawAmountStr.split('.');
        const hasThreeDecimals = decSplit.length > 1 && decSplit[1].length > 2;
        if (hasThreeDecimals) {
          rowAnomalies.push({
            type: 'PRECISION_WARNING',
            severity: 'WARNING',
            description: `Row ${rowNum} contains fractional currency units (${rawAmountStr}). Will be rounded to 2 decimal places.`,
          });
          hasAnomaly = true;
        }

        // 9. Split validation (percentages, inactive users)
        const splitType = (row.split_type || 'equal').trim().toLowerCase();
        const splitWithNames = (row.split_with || '').split(';').map(n => n.trim()).filter(n => n.length > 0);
        const splitWithIds = [];
        const splitDetails = {};

        // Normalizing split details
        const detailsStr = (row.split_details || '').trim();
        if (detailsStr) {
          // split_details pattern: "Rohan 700; Priya 400; Meera 400"
          const detailPairs = detailsStr.split(';').map(p => p.trim()).filter(p => p.length > 0);
          detailPairs.forEach(pair => {
            // Split last space or custom mapping
            const lastSpaceIdx = pair.lastIndexOf(' ');
            if (lastSpaceIdx !== -1) {
              const name = pair.substring(0, lastSpaceIdx).trim();
              const val = parseFloat(pair.substring(lastSpaceIdx + 1).trim());
              const resolvedId = resolveName(name);
              if (resolvedId) {
                splitDetails[resolvedId] = val;
              }
            }
          });
        }

        splitWithNames.forEach(name => {
          const resolvedId = resolveName(name);
          if (resolvedId) {
            splitWithIds.push(resolvedId);
          } else {
            rowAnomalies.push({
              type: 'UNREGISTERED_MEMBER',
              severity: 'WARNING',
              description: `Row ${rowNum} split list includes unregistered member "${name}".`,
              unregisteredName: name,
            });
            hasAnomaly = true;
          }
        });

        // Sum weights check
        if (splitType === 'percentage' && Object.keys(splitDetails).length > 0) {
          let sum = 0;
          Object.values(splitDetails).forEach(v => { sum += v; });
          if (Math.abs(sum - 100) > 0.01) {
            rowAnomalies.push({
              type: 'INVALID_SPLITTING_WEIGHTS',
              severity: 'ERROR',
              description: `Row ${rowNum} splits sum to ${sum}% (expected exactly 100%).`,
              sumWeights: sum,
            });
            hasAnomaly = true;
          }
        }

        // 10. Temporal scoping: inactive users split checks
        if (dateResult.date) {
          const targetDate = new Date(dateResult.date);
          const activeMembersOnDate = memberships.filter(m => {
            const joined = new Date(m.joinedAt);
            const left = m.leftAt ? new Date(m.leftAt) : null;
            return joined <= targetDate && (!left || targetDate <= left);
          });
          const activeIds = activeMembersOnDate.map(m => m.userId);

          const inactiveUsersInSplit = splitWithIds.filter(uid => !activeIds.includes(uid));
          if (inactiveUsersInSplit.length > 0) {
            const inactiveNames = inactiveUsersInSplit.map(uid => {
              if (uid === 1) return 'Aisha';
              if (uid === 2) return 'Rohan';
              if (uid === 3) return 'Priya';
              if (uid === 4) return 'Meera';
              if (uid === 5) return 'Sam';
              if (uid === 6) return 'Dev';
              return 'Unknown';
            });
            rowAnomalies.push({
              type: 'INACTIVE_MEMBER_SPLIT',
              severity: 'WARNING',
              description: `Row ${rowNum} splits with inactive group member(s) (${inactiveNames.join(', ')}) on ${targetDate.toLocaleDateString()}.`,
              inactiveUserIds: inactiveUsersInSplit
            });
            hasAnomaly = true;
          }
        }

        // 11. Swiggy Zero amount check
        if (amountVal === 0) {
          rowAnomalies.push({
            type: 'ZERO_AMOUNT',
            severity: 'WARNING',
            description: `Row ${rowNum} expense amount is zero. Typically indicates a cancelled or invalid line.`,
          });
          hasAnomaly = true;
        }

        // Create the staged row record
        const stagedId = rowNum * 100 + Date.now() % 100;
        const stagedRow = {
          id: stagedId,
          rowNumber: rowNum,
          date: dateResult.date || new Date().toISOString(),
          originalDateText: row.date,
          description: row.description,
          originalAmount: row.amount,
          amount: isNaN(amountVal) ? 0 : Math.round(amountVal * 100) / 100,
          currency: currencyStr || 'INR',
          paidBy: paidByName,
          paidById: payerId,
          splitType: splitType,
          splitWith: splitWithIds,
          splitDetails: splitDetails,
          isFlagged: hasAnomaly,
          isExcluded: false, // Turned true if user deletes/disallows this row
          isSettlementClassification: isSettlement,
        };

        state.stagedExpenses.push(stagedRow);

        // Append anomalies labeled by this staged row
        rowAnomalies.forEach((an, idx) => {
          state.anomalies.push({
            id: stagedId * 10 + idx,
            rowNumber: rowNum,
            stagedExpenseId: stagedId,
            type: an.type,
            severity: an.severity,
            description: an.description,
            isResolved: false,
            resolutionAction: null,
            duplicateOfRow: an.duplicateOfRow || null,
            unregisteredName: an.unregisteredName || null,
            inactiveUserIds: an.inactiveUserIds || null,
          });
        });

        // Add to cache for subsequent checks
        parsedRows.push({
          rowNumber: rowNum,
          date: row.date,
          paid_by: row.paid_by,
          amount: row.amount,
          description: row.description,
        });
      });
    },
    parseCSVFailed: (state, action) => {
      state.loading = false;
      state.error = action.payload;
      state.isParsed = false;
    },
    resolveAnomaly: (state, action) => {
      const { anomalyId, resolutionAction, updatedStagedRow } = action.payload;
      
      const anomalyIndex = state.anomalies.findIndex(a => a.id === anomalyId);
      if (anomalyIndex !== -1) {
        state.anomalies[anomalyIndex].isResolved = true;
        state.anomalies[anomalyIndex].resolutionAction = resolutionAction;
        
        // Update the related staged expense row attributes
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
        
        // Resolve all anomalies of this row as "Excluded"
        state.anomalies.forEach(a => {
          if (a.stagedExpenseId === stagedId) {
            a.isResolved = true;
            a.resolutionAction = 'Row Excluded/Skipped';
          }
        });
      }
    },
    completeImport: (state) => {
      if (state.importSession) {
        state.importSession.status = 'COMPLETED';
        state.isParsed = false;

        // Generate report and push to reports history
        const report = {
          importId: state.importSession.id,
          filename: state.importSession.filename,
          importedAt: new Date().toISOString(),
          totalRows: state.stagedExpenses.length,
          importedRows: state.stagedExpenses.filter(s => !s.isExcluded).length,
          excludedRows: state.stagedExpenses.filter(s => s.isExcluded).length,
          anomaliesHandled: state.anomalies.map(a => ({
            rowNumber: a.rowNumber,
            type: a.type,
            severity: a.severity,
            description: a.description,
            resolution: a.resolutionAction || 'Default system handling applied'
          }))
        };
        state.historyReports.push(report);
      }
    },
    cancelImport: (state) => {
      state.importSession = null;
      state.stagedExpenses = [];
      state.anomalies = [];
      state.isParsed = false;
    }
  }
});

export const { 
  startParsing, 
  parseCSVSuccess, 
  parseCSVFailed, 
  resolveAnomaly, 
  excludeStagedRow, 
  completeImport, 
  cancelImport 
} = importSlice.actions;

export default importSlice.reducer;
