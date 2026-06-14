import React from 'react';

const AuditTrailDetail = ({ auditTrail, groupMemberships, onClose }) => {
  if (!auditTrail) return null;

  const { description, amount, amountInINR, currency, paidBy, date, splitType, splits } = auditTrail;
  
  const targetDate = new Date(date);
  const formattedDate = targetDate.toLocaleDateString(undefined, {
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });

  const activeMembersList = groupMemberships.filter(m => {
    const joined = new Date(m.joinedAt);
    const left = m.leftAt ? new Date(m.leftAt) : null;
    return joined <= targetDate && (!left || targetDate <= left);
  });
  
  const inactiveMembersList = groupMemberships.filter(m => {
    const joined = new Date(m.joinedAt);
    const left = m.leftAt ? new Date(m.leftAt) : null;
    return joined > targetDate || (left && targetDate > left);
  });

  const getUserName = (uid) => {
    if (uid === 1) return 'Aisha';
    if (uid === 2) return 'Rohan';
    if (uid === 3) return 'Priya';
    if (uid === 4) return 'Meera';
    if (uid === 5) return 'Sam';
    if (uid === 6) return 'Dev';
    return `User ${uid}`;
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in font-sans">
      <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl max-w-xl w-full overflow-hidden">
        <div className="px-6 py-4 bg-brand-light border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="font-bold font-serif text-slate-800 text-lg">Math Calculation Audit Trail</h3>
            <p className="text-xs text-brand">Rohan's Request: Full ledger verification trace</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl font-bold cursor-pointer">×</button>
        </div>

        <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          {/* Summary Details */}
          <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 grid grid-cols-2 gap-4">
            <div>
              <span className="block text-[9px] uppercase font-bold text-slate-400">Description</span>
              <span className="font-bold text-slate-800 text-sm">{description}</span>
            </div>
            <div>
              <span className="block text-[9px] uppercase font-bold text-slate-400">Expense Date</span>
              <span className="font-bold text-slate-800 text-sm">{formattedDate}</span>
            </div>
            <div>
              <span className="block text-[9px] uppercase font-bold text-slate-400">Payer</span>
              <span className="font-bold text-slate-800 text-sm">{paidBy}</span>
            </div>
            <div>
              <span className="block text-[9px] uppercase font-bold text-slate-400">Total Charged</span>
              <span className="font-bold text-slate-800 text-sm">
                {currency} {amount.toLocaleString()}
                {currency !== 'INR' && (
                  <span className="block text-xs font-bold text-brand">
                    ≈ ₹{amountInINR.toLocaleString()} (@ ₹83/$)
                  </span>
                )}
              </span>
            </div>
          </div>

          {/* Temporal Membership Scopes */}
          <div>
            <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-3">Temporal Membership Scoping</h4>
            <div className="space-y-2">
              <div className="text-xs bg-emerald-50 text-emerald-800 p-2 border border-emerald-100 rounded">
                <strong>Active members participating in splits:</strong>{' '}
                {activeMembersList.map(m => getUserName(m.userId)).join(', ')}
              </div>
              {inactiveMembersList.length > 0 && (
                <div className="text-xs bg-rose-50 text-rose-800 p-2 border border-rose-100 rounded">
                  <strong>Excluded members (due to join/leave dates):</strong>{' '}
                  {inactiveMembersList.map(m => {
                    const name = getUserName(m.userId);
                    const leftStr = m.leftAt ? `left on ${new Date(m.leftAt).toLocaleDateString()}` : `joined on ${new Date(m.joinedAt).toLocaleDateString()}`;
                    return `${name} (${leftStr})`;
                  }).join(', ')}
                </div>
              )}
            </div>
          </div>

          {/* Split math breakdown */}
          <div>
            <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-3">Calculation Details (Split Type: {splitType})</h4>
            <div className="bg-brand-light border border-brand-light rounded-xl p-4 text-brand-text text-xs leading-relaxed space-y-2">
              {splitType === 'equal' && (
                <>
                  <p><strong>Formula:</strong> <code>(Total INR Amount) / (Eligible Participants Count)</code></p>
                  <p>
                    <code>₹{amountInINR} / {splits.length} participants = ₹{(amountInINR / splits.length).toFixed(4)}</code> each.
                  </p>
                  <p>
                    <strong>Rounding Adjustment:</strong> Rounded to <code>₹{(Math.round((amountInINR / splits.length) * 100) / 100).toFixed(2)}</code> per person.
                  </p>
                  {(() => {
                    const count = splits.length;
                    const rShare = Math.round((amountInINR / count) * 100) / 100;
                    const totalAlloc = rShare * count;
                    const remainder = Math.round((amountInINR - totalAlloc) * 100) / 100;
                    if (Math.abs(remainder) > 0.001) {
                      return (
                        <p className="text-brand font-bold">
                          * A rounding adjustment remainder of <code>₹{remainder.toFixed(2)}</code> was allocated to {splits[0]?.username} to ensure the splits sum to exactly the paid ledger amount.
                        </p>
                      );
                    }
                    return null;
                  })()}
                </>
              )}

              {splitType === 'percentage' && (
                <>
                  <p><strong>Formula:</strong> <code>(Total INR Amount) * (Participant % Weight) / 100</code></p>
                  <p>Total amount: <code>₹{amountInINR}</code>. Participant shares calculated individually based on their specific splits.</p>
                </>
              )}

              {splitType === 'share' && (
                <>
                  <p><strong>Formula:</strong> <code>(Total INR Amount) * (Participant Share Ratio) / (Sum of Share Ratios)</code></p>
                  <p>Total amount: <code>₹{amountInINR}</code>. Shares distributed proportionally based on user ratios.</p>
                </>
              )}

              {splitType === 'unequal' && (
                <>
                  <p><strong>Formula:</strong> Custom absolute values set per person (summing to the total bill amount).</p>
                </>
              )}
            </div>
          </div>

          {/* Breakdown results */}
          <div>
            <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-3">Individual Debt Allocations</h4>
            <div className="border border-slate-200 rounded-xl overflow-hidden text-sm">
              <table className="min-w-full divide-y divide-slate-200 text-left">
                <thead className="bg-slate-50 font-bold text-slate-500 text-xs uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-2">User</th>
                    <th className="px-4 py-2">Split Status</th>
                    <th className="px-4 py-2 text-right">Share Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {splits.map((s, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="px-4 py-2.5 font-bold">{s.username}</td>
                      <td className="px-4 py-2.5 text-xs text-slate-400">
                        {paidBy === s.username ? (
                          <span className="text-brand font-semibold">Payer (Owed balance difference)</span>
                        ) : (
                          <span>Owes split value</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-right font-bold text-slate-800">₹{s.shareAmount.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 text-right">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-brand hover:bg-brand-dark text-white rounded-lg text-xs font-bold shadow-md cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

export default AuditTrailDetail;
