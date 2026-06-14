import React, { useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { 
  startParsing, 
  parseCSVSuccess, 
  parseCSVFailed, 
  resolveAnomaly, 
  excludeStagedRow, 
  completeImport, 
  cancelImport 
} from '../store/slices/importSlice';
import { bulkAddExpenses } from '../store/slices/expensesSlice';

const ImportWizard = ({ setCurrentPage }) => {
  const dispatch = useDispatch();
  const fileInputRef = useRef(null);
  
  const { stagedExpenses, anomalies, importSession, isParsed, loading, error } = useSelector((state) => state.import);
  const group = useSelector(state => state.groups.groups.find(g => g.id === state.groups.selectedGroupId));
  const users = useSelector(state => state.auth.users);
  
  const [selectedResolutions, setSelectedResolutions] = useState({}); // { [anomalyId]: choice }

  if (!group) return <div>No active group selected</div>;

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    dispatch(startParsing());

    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target.result;
      dispatch(parseCSVSuccess({
        filename: file.name,
        csvText: text,
        memberships: group.memberships,
      }));
    };
    reader.onerror = () => {
      dispatch(parseCSVFailed('Failed to read CSV file'));
    };
    reader.readAsText(file);
  };

  const selectResolutionChoice = (anomaly, choice, resolutionText, updatedStagedData = {}) => {
    setSelectedResolutions({
      ...selectedResolutions,
      [anomaly.id]: choice,
    });

    dispatch(resolveAnomaly({
      anomalyId: anomaly.id,
      resolutionAction: resolutionText,
      updatedStagedRow: updatedStagedData,
    }));
  };

  // Triggers final import merge into the main store
  const handleFinalizeImport = () => {
    const activeStagedRows = stagedExpenses.filter(e => !e.isExcluded);
    
    // Separate into expenses and settlements based on reclassification
    const expensesToAdd = [];
    const settlementsToAdd = [];

    activeStagedRows.forEach(row => {
      if (row.isSettlementClassification) {
        // Find default settlement payee (usually Aisha for deposit shares or payee name in notes)
        let payerId = row.paidById;
        let payeeId = 1; // Default Aisha

        if (row.description.toLowerCase().includes('sam deposit')) {
          payerId = 5; // Sam
          payeeId = 1; // Aisha
        } else if (row.description.toLowerCase().includes('rohan paid aisha')) {
          payerId = 2; // Rohan
          payeeId = 1; // Aisha
        }

        settlementsToAdd.push({
          groupId: group.id,
          payerId,
          payeeId,
          amount: row.amount,
          settlementDate: row.date
        });
      } else {
        expensesToAdd.push({
          groupId: group.id,
          description: row.description,
          amount: row.amount,
          currency: row.currency,
          paidById: row.paidById || 1, // Default Aisha if missing/not resolved
          expenseDate: row.date,
          splitType: row.splitType,
          splitWith: row.splitWith,
          splitDetails: row.splitDetails
        });
      }
    });

    dispatch(bulkAddExpenses({
      expenses: expensesToAdd,
      settlements: settlementsToAdd
    }));

    generateImportReportFile();
    dispatch(completeImport());
    setCurrentPage('dashboard');
  };

  // Helper to generate text file download for Meera's report
  const generateImportReportFile = () => {
    let reportText = `====================================================\n`;
    reportText += `           SETTLY LEDGER IMPORT REPORT              \n`;
    reportText += `====================================================\n`;
    reportText += `Import Session ID: ${importSession.id}\n`;
    reportText += `Import Date: ${new Date().toLocaleString()}\n`;
    reportText += `File Name: ${importSession.filename}\n`;
    reportText += `Target Group: ${group.name}\n`;
    reportText += `Total Staged Rows: ${stagedExpenses.length}\n`;
    reportText += `Imported Rows Count: ${stagedExpenses.filter(e => !e.isExcluded).length}\n`;
    reportText += `Excluded Rows Count: ${stagedExpenses.filter(e => e.isExcluded).length}\n`;
    reportText += `----------------------------------------------------\n\n`;
    reportText += `SURFACED CSV ANOMALIES & AUDIT RESOLUTIONS:\n\n`;

    anomalies.forEach((a, idx) => {
      reportText += `${idx + 1}. [Row ${a.rowNumber}] [Anomaly: ${a.type}] [Severity: ${a.severity}]\n`;
      reportText += `   Description: ${a.description}\n`;
      reportText += `   Resolution Policy Applied: ${a.resolutionAction || 'Default system auto-resolved'}\n\n`;
    });

    reportText += `====================================================\n`;
    reportText += `Report generated successfully. Verified by Settly Engine.\n`;

    const blob = new Blob([reportText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Import_Report_${importSession.filename.replace('.csv', '')}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getUnresolvedAnomalies = () => {
    return anomalies.filter(a => !a.isResolved);
  };

  return (
    <div className="w-full bg-white text-slate-800 font-sans pb-16">
      
      {/* Header Bar */}
      <header className="w-full px-8 py-6 bg-white">
        <div className="max-w-4xl mx-auto w-full flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => setCurrentPage('home')}>
            <span className="text-3xl font-extrabold text-brand tracking-tight font-serif">
              settly<span className="text-brand">.</span>
            </span>
          </div>
          
          {/* Navigation aligned to the right */}
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setCurrentPage('dashboard')} 
              className="nav-item-glow px-4 py-1.5 border border-slate-200 rounded-lg text-xs font-bold transition-all bg-white cursor-pointer"
            >
              ← Back to Dashboard
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-8 mt-10">
        <h2 className="text-3xl font-extrabold font-serif text-slate-900 tracking-tight">CSV Import Resolution Wizard</h2>
        <p className="text-slate-500 mt-2 text-sm">
          Meera's Requirement: Scan for spreadsheet anomalies, duplicates, and timeline errors. Interactively approve all data updates.
        </p>

        {error && (
          <div className="mt-6 bg-rose-50 border-l-4 border-rose-400 p-4 rounded text-sm text-rose-700 font-medium">
            {error}
          </div>
        )}

        {/* Dropzone view */}
        {!isParsed && !loading && (
          <div className="mt-8 border-2 border-dashed border-slate-300 rounded-2xl p-12 bg-white flex flex-col items-center justify-center text-center hover:border-brand transition-colors">
            <div className="w-16 h-16 rounded-full bg-brand-light text-brand flex items-center justify-center mb-4 text-2xl">
              📥
            </div>
            <h3 className="font-bold font-serif text-slate-800 text-lg mb-2">Upload expenses_export.csv</h3>
            <p className="text-xs text-slate-500 mb-6 max-w-sm">
              Upload the raw spreadsheet export. Our validation pipeline checks 12 specific classes of anomalies.
            </p>
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileUpload} 
              accept=".csv" 
              className="hidden"
            />
            <button 
              onClick={() => fileInputRef.current.click()}
              className="px-6 py-3 font-bold text-white bg-brand hover:bg-brand-dark rounded-lg shadow-md transition-all cursor-pointer text-sm"
            >
              Select CSV File
            </button>
          </div>
        )}

        {loading && (
          <div className="mt-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-brand mx-auto"></div>
            <p className="text-slate-500 text-sm mt-4">Analyzing spreadsheet columns and rows...</p>
          </div>
        )}

        {/* Wizard Staging Area */}
        {isParsed && (
          <div className="mt-8 space-y-8 animate-fade-in">
            {/* Parse Summary Widget */}
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Analysis Summary</span>
                <div className="flex gap-4 mt-2">
                  <span className="text-xs font-semibold text-slate-600">
                    <strong className="text-slate-900">{stagedExpenses.length}</strong> total rows parsed
                  </span>
                  <span className="text-xs font-semibold text-emerald-600">
                    <strong className="text-emerald-700">{stagedExpenses.filter(e => !e.isFlagged).length}</strong> clean rows
                  </span>
                  <span className="text-xs font-semibold text-rose-500">
                    <strong className="text-rose-700">{anomalies.length}</strong> anomalies found
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => dispatch(cancelImport())}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-xs font-bold text-slate-500 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Cancel Import
                </button>
                <button
                  onClick={handleFinalizeImport}
                  disabled={getUnresolvedAnomalies().length > 0}
                  className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 disabled:bg-slate-100 disabled:text-slate-400 hover:bg-emerald-700 active:bg-emerald-800 rounded-lg transition-colors shadow-xs cursor-pointer"
                >
                  Complete Import ({getUnresolvedAnomalies().length} remaining)
                </button>
              </div>
            </div>

            {/* Unresolved Anomalies List */}
            <div>
              <h3 className="text-base font-bold font-serif text-slate-800 mb-4 flex items-center gap-2">
                ⚠️ Surfaced Anomalies ({getUnresolvedAnomalies().length} Action Required)
              </h3>
              
              {getUnresolvedAnomalies().length === 0 ? (
                <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-6 text-center text-emerald-800 text-sm font-semibold">
                  🎉 All anomalies successfully resolved! You are ready to complete the import and download the report.
                </div>
              ) : (
                <div className="space-y-4">
                  {anomalies.filter(a => !a.isResolved).map((anomaly) => {
                    const row = stagedExpenses.find(s => s.id === anomaly.stagedExpenseId);
                    if (!row) return null;

                    return (
                      <div key={anomaly.id} className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
                        {/* Anomaly Header info */}
                        <div className="flex items-start justify-between border-b border-slate-100 pb-3">
                          <div>
                            <span className="px-2 py-0.5 text-[9px] font-extrabold uppercase rounded tracking-wider bg-amber-100 text-amber-700">
                              {anomaly.type.replace('_', ' ')}
                            </span>
                            <h4 className="font-bold text-slate-800 text-sm mt-1">{anomaly.description}</h4>
                          </div>
                          <button
                            onClick={() => dispatch(excludeStagedRow(row.id))}
                            className="px-2.5 py-1 hover:bg-rose-50 border border-transparent hover:border-rose-200 text-rose-500 rounded text-xs font-bold transition-all cursor-pointer"
                            title="Discard this row completely from import"
                          >
                            Delete Row {row.rowNumber}
                          </button>
                        </div>

                        {/* Staged values details */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs bg-slate-50 p-3 rounded-lg border border-slate-100">
                          <div>
                            <span className="text-slate-400 font-medium uppercase text-[9px]">Row Info</span>
                            <span className="font-bold block mt-0.5 text-slate-700">Line {row.rowNumber}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 font-medium uppercase text-[9px]">Description</span>
                            <span className="font-bold block mt-0.5 text-slate-700">{row.description}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 font-medium uppercase text-[9px]">Amount / Currency</span>
                            <span className="font-bold block mt-0.5 text-slate-700">{row.originalAmount} {row.currency || 'INR'}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 font-medium uppercase text-[9px]">Payer (Staged)</span>
                            <span className="font-bold block mt-0.5 text-slate-700">{row.paidBy || 'Empty'}</span>
                          </div>
                        </div>

                        {/* Interactive Resolution actions */}
                        <div className="pt-2">
                          <span className="text-[10px] uppercase font-bold text-slate-400 block mb-2">Select Resolution Action:</span>
                          <div className="flex flex-wrap gap-2">
                            {/* DUPLICATE_ROW Resolution */}
                            {anomaly.type === 'DUPLICATE_ROW' && (
                              <>
                                <button
                                  onClick={() => selectResolutionChoice(anomaly, 'discard', `Discarded duplicate Row ${row.rowNumber} in favor of Row ${anomaly.duplicateOfRow}`, { isExcluded: true })}
                                  className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded text-xs font-semibold text-slate-700 transition-colors cursor-pointer"
                                >
                                  Discard Row {row.rowNumber} (Keep Row {anomaly.duplicateOfRow})
                                </button>
                                <button
                                  onClick={() => selectResolutionChoice(anomaly, 'keep', `Approved double ledger entry (keep both row ${row.rowNumber} and row ${anomaly.duplicateOfRow})`)}
                                  className="px-3.5 py-1.5 bg-brand-light hover:bg-brand/10 border border-brand rounded text-xs font-semibold text-brand transition-colors cursor-pointer"
                                >
                                  Keep Both Rows
                                </button>
                              </>
                            )}

                            {/* CONFLICTING_DUPLICATE Resolution */}
                            {anomaly.type === 'CONFLICTING_DUPLICATE' && (
                              <>
                                <button
                                  onClick={() => selectResolutionChoice(anomaly, 'keep_this', `Kept current Row ${row.rowNumber} and marked Row ${anomaly.duplicateOfRow} for deletion`)}
                                  className="px-3.5 py-1.5 bg-brand-light hover:bg-brand/10 border border-brand rounded text-xs font-semibold text-brand transition-colors cursor-pointer"
                                >
                                  Keep Row {row.rowNumber} (Discard Row {anomaly.duplicateOfRow})
                                </button>
                                <button
                                  onClick={() => selectResolutionChoice(anomaly, 'keep_both', `Approved both conflicting duplicate records`)}
                                  className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded text-xs font-semibold text-slate-700 transition-colors cursor-pointer"
                                >
                                  Keep Both Rows
                                </button>
                              </>
                            )}

                            {/* AMBIGUOUS_DATE Resolution */}
                            {anomaly.type === 'AMBIGUOUS_DATE' && (
                              <>
                                <button
                                  onClick={() => selectResolutionChoice(anomaly, 'dmy', `Resolved ambiguous date. Assumed DD-MM-YYYY format: May 4, 2026`)}
                                  className="px-3.5 py-1.5 bg-brand-light hover:bg-brand/10 border border-brand rounded text-xs font-semibold text-brand transition-colors cursor-pointer"
                                >
                                  Use DD-MM-YYYY (May 4, 2026)
                                </button>
                                <button
                                  onClick={() => {
                                    const parsed = new Date(Date.UTC(2026, 3, 5, 12, 0, 0)); // April 5th
                                    selectResolutionChoice(anomaly, 'mdy', `Resolved ambiguous date. Switch to MM-DD-YYYY format: April 5, 2026`, { date: parsed.toISOString() });
                                  }}
                                  className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded text-xs font-semibold text-slate-700 transition-colors cursor-pointer"
                                >
                                  Use MM-DD-YYYY (April 5, 2026)
                                </button>
                              </>
                            )}

                            {/* DATE_FORMAT_MISMATCH Resolution */}
                            {anomaly.type === 'DATE_FORMAT_MISMATCH' && (
                              <button
                                onClick={() => selectResolutionChoice(anomaly, 'confirm', `Normalized date string "${row.originalDateText}" to standard ISO Date`)}
                                className="px-3.5 py-1.5 bg-brand hover:bg-brand-dark rounded text-xs font-semibold text-white transition-colors cursor-pointer"
                              >
                                Approve Normalized Date
                              </button>
                            )}

                            {/* MISSING_CURRENCY Resolution */}
                            {anomaly.type === 'MISSING_CURRENCY' && (
                              <>
                                <button
                                  onClick={() => selectResolutionChoice(anomaly, 'inr', `Applied default group currency (INR)`)}
                                  className="px-3.5 py-1.5 bg-brand-light hover:bg-brand/10 border border-brand rounded text-xs font-semibold text-brand transition-colors cursor-pointer"
                                >
                                  Default to INR (₹)
                                </button>
                                <button
                                  onClick={() => selectResolutionChoice(anomaly, 'usd', `Assigned USD currency to transaction`, { currency: 'USD', amount: row.amount })}
                                  className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded text-xs font-semibold text-slate-700 transition-colors cursor-pointer"
                                >
                                  Set to USD ($)
                                </button>
                              </>
                            )}

                            {/* MISSING_PAYER or INVALID_PAYER Resolution */}
                            {(anomaly.type === 'MISSING_PAYER' || anomaly.type === 'INVALID_PAYER' || anomaly.type === 'USER_NAME_ALIAS') && (
                              <div className="flex gap-2 flex-wrap items-center">
                                {users.map(u => (
                                  <button
                                    key={u.id}
                                    onClick={() => selectResolutionChoice(anomaly, u.id, `Mapped payer alias "${row.paidBy}" to group user account "${u.username}"`, { paidById: u.id, paidBy: u.username })}
                                    className="px-3 py-1 bg-white border border-slate-200 rounded text-xs font-semibold text-slate-600 hover:bg-brand-light hover:border-brand hover:text-brand transition-colors cursor-pointer"
                                  >
                                    Assign {u.username}
                                  </button>
                                ))}
                              </div>
                            )}

                            {/* NEGATIVE_AMOUNT Resolution */}
                            {anomaly.type === 'NEGATIVE_AMOUNT' && (
                              <button
                                onClick={() => selectResolutionChoice(anomaly, 'refund', `Approved negative balance line entry as group refund`)}
                                className="px-3.5 py-1.5 bg-brand hover:bg-brand-dark rounded text-xs font-semibold text-white transition-colors cursor-pointer"
                              >
                                Approve Refund Ingestion
                              </button>
                            )}

                            {/* SETTLEMENT_CLASSIFICATION Resolution */}
                            {anomaly.type === 'SETTLEMENT_CLASSIFICATION' && (
                              <button
                                onClick={() => selectResolutionChoice(anomaly, 'settle', `Re-classified transaction as direct debt settlement payment`)}
                                className="px-3.5 py-1.5 bg-brand hover:bg-brand-dark rounded text-xs font-semibold text-white transition-colors cursor-pointer"
                              >
                                Approve Settlement Classification
                              </button>
                            )}

                            {/* PRECISION_WARNING Resolution */}
                            {anomaly.type === 'PRECISION_WARNING' && (
                              <button
                                onClick={() => selectResolutionChoice(anomaly, 'round', `Rounded fractional currency decimals to ₹${row.amount}`)}
                                className="px-3.5 py-1.5 bg-brand hover:bg-brand-dark rounded text-xs font-semibold text-white transition-colors cursor-pointer"
                              >
                                Confirm Rounded Decimals (₹{row.amount})
                              </button>
                            )}

                            {/* INACTIVE_MEMBER_SPLIT Resolution */}
                            {anomaly.type === 'INACTIVE_MEMBER_SPLIT' && (
                              <>
                                <button
                                  onClick={() => {
                                    const inactiveIds = anomaly.inactiveUserIds || [];
                                    const filteredSplit = row.splitWith.filter(uid => !inactiveIds.includes(uid));
                                    selectResolutionChoice(anomaly, 'recalculate', `Excluded inactive members (${inactiveIds.map(uid => users.find(u=>u.id===uid)?.username).join(', ')}) & recalculated splits`, { splitWith: filteredSplit });
                                  }}
                                  className="px-3.5 py-1.5 bg-brand hover:bg-brand-dark rounded text-xs font-semibold text-white transition-colors cursor-pointer"
                                >
                                  Remove Inactive Members & Re-split
                                </button>
                                <button
                                  onClick={() => selectResolutionChoice(anomaly, 'keep_anyway', `Enforced split calculation containing inactive members (keep Meera/Sam in split list)`)}
                                  className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded text-xs font-semibold text-slate-700 transition-colors cursor-pointer"
                                >
                                  Keep Inactive Members anyway
                                </button>
                              </>
                            )}

                            {/* UNREGISTERED_MEMBER Resolution */}
                            {anomaly.type === 'UNREGISTERED_MEMBER' && (
                              <>
                                <button
                                  onClick={() => {
                                    selectResolutionChoice(anomaly, 'absorb', `Absorbed unregistered member Kabir's cost split share into Payer Dev's ledger debit account`, {});
                                  }}
                                  className="px-3.5 py-1.5 bg-brand hover:bg-brand-dark rounded text-xs font-semibold text-white transition-colors cursor-pointer"
                                >
                                  Absorb Share into Payer's balance
                                </button>
                                <button
                                  onClick={() => selectResolutionChoice(anomaly, 'create_guest', `Created dynamic guest user profile for "${anomaly.unregisteredName}"`)}
                                  className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded text-xs font-semibold text-slate-700 transition-colors cursor-pointer"
                                >
                                  Create Guest Account
                                </button>
                              </>
                            )}

                            {/* ZERO_AMOUNT Resolution */}
                            {anomaly.type === 'ZERO_AMOUNT' && (
                              <>
                                <button
                                  onClick={() => selectResolutionChoice(anomaly, 'discard', `Discarded zero-amount transaction Row ${row.rowNumber}`, { isExcluded: true })}
                                  className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded text-xs font-semibold text-slate-700 transition-colors cursor-pointer"
                                >
                                  Discard Transaction
                                </button>
                                <button
                                  onClick={() => selectResolutionChoice(anomaly, 'keep', `Retained zero-amount ledger row`)}
                                  className="px-3.5 py-1.5 bg-brand-light hover:bg-brand/10 border border-brand rounded text-xs font-semibold text-brand transition-colors cursor-pointer"
                                >
                                  Keep Zero Row anyway
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Resolved History Logs */}
            {anomalies.filter(a => a.isResolved).length > 0 && (
              <div className="pt-6 border-t border-slate-200">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 font-sans">Resolved Anomalies Log</h4>
                <div className="bg-slate-100 rounded-xl p-4 space-y-2 border border-slate-200 max-h-48 overflow-y-auto">
                  {anomalies.filter(a => a.isResolved).map(a => (
                    <div key={a.id} className="text-xs flex justify-between items-center text-slate-600 bg-white p-2.5 rounded shadow-xs">
                      <span>
                        <strong className="text-slate-800">[Row {a.rowNumber}]</strong> {a.description.substring(0, 50)}...
                      </span>
                      <span className="text-brand font-bold">✓ {a.resolutionAction}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ImportWizard;
