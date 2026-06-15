import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { createExpense, fetchExpenses } from '../../store/slices/expensesSlice';

const AddExpenseForm = ({ groupId, onClose }) => {
  const dispatch = useDispatch();
  // Use Number() to ensure type-safe match (API returns numbers, props may be strings)
  const group = useSelector(state => state.groups.groups.find(g => g.id === Number(groupId)));

  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('INR');
  const [paidById, setPaidById] = useState('');
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split('T')[0]);
  const [splitType, setSplitType] = useState('equal');

  // Members active on the chosen date
  const [activeMembers, setActiveMembers] = useState([]);
  const [selectedSplitIds, setSelectedSplitIds] = useState([]);
  const [splitDetails, setSplitDetails] = useState({}); // { [userId]: value }
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Update active members list whenever the date changes
  useEffect(() => {
    if (!group) return;
    // expenseDate is 'YYYY-MM-DD'; parse as UTC to match DB timestamps
    const targetDate = new Date(expenseDate + 'T23:59:59Z');
    // memberships from the API already include userId and username
    const filtered = (group.memberships || []).filter(m => {
      const joined = new Date(m.joinedAt);
      const left = m.leftAt ? new Date(m.leftAt) : null;
      return joined <= targetDate && (!left || targetDate <= left);
    });

    // Build activeMembers directly from membership data (no user-store lookup needed)
    const activeUserList = filtered.map(m => ({ id: m.userId, username: m.username }));
    setActiveMembers(activeUserList);

    // Auto-select all active members by default
    const ids = activeUserList.map(u => u.id);
    setSelectedSplitIds(ids);

    // Reset details
    const initDetails = {};
    ids.forEach(id => {
      initDetails[id] = '';
    });
    setSplitDetails(initDetails);
  }, [expenseDate, group]);

  if (!group) return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl max-w-sm w-full p-6 text-center">
        <span className="text-3xl block mb-3">⚠️</span>
        <h3 className="font-bold text-slate-800 mb-1">No Group Found</h3>
        <p className="text-sm text-slate-500 mb-4">
          Your account isn't part of any group yet. Please join or create a group first, or log in as a seeded user (e.g. <strong>aisha@settly.com</strong> / <strong>password123</strong>).
        </p>
        <button onClick={onClose} className="px-4 py-2 bg-brand text-white rounded-lg text-sm font-bold">Close</button>
      </div>
    </div>
  );

  const handleCheckboxChange = (userId) => {
    if (selectedSplitIds.includes(userId)) {
      setSelectedSplitIds(selectedSplitIds.filter(id => id !== userId));
    } else {
      setSelectedSplitIds([...selectedSplitIds, userId]);
    }
  };

  const handleDetailChange = (userId, value) => {
    setSplitDetails({
      ...splitDetails,
      [userId]: value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!description) return setFormError('Description is required');
    if (!amount || parseFloat(amount) <= 0) return setFormError('Please enter a valid positive amount');
    if (!paidById) return setFormError('Please select who paid');
    if (selectedSplitIds.length === 0) return setFormError('Please select at least one person to split with');

    const payerIdNum = parseInt(paidById);
    if (!activeMembers.some(m => m.id === payerIdNum)) {
      return setFormError('The payer is not an active group member on the selected date!');
    }

    const inactiveSplits = selectedSplitIds.filter(uid => !activeMembers.some(m => m.id === uid));
    if (inactiveSplits.length > 0) {
      return setFormError('Some split participants are inactive on this date. Please uncheck them.');
    }

    const finalDetails = {};
    if (splitType === 'percentage') {
      let sum = 0;
      for (const uid of selectedSplitIds) {
        const val = parseFloat(splitDetails[uid] || 0);
        if (isNaN(val) || val <= 0) return setFormError('Percentages must be positive numbers');
        sum += val;
        finalDetails[uid] = val;
      }
      if (Math.abs(sum - 100) > 0.01) return setFormError(`Percentages must sum to exactly 100%. Current: ${sum}%`);
    } else if (splitType === 'share') {
      for (const uid of selectedSplitIds) {
        const val = parseFloat(splitDetails[uid] || 0);
        if (isNaN(val) || val <= 0) return setFormError('Shares must be positive ratios (e.g. 1, 2)');
        finalDetails[uid] = val;
      }
    } else if (splitType === 'unequal') {
      let totalSplit = 0;
      for (const uid of selectedSplitIds) {
        const val = parseFloat(splitDetails[uid] || 0);
        if (isNaN(val) || val < 0) return setFormError('Amounts must be non-negative');
        totalSplit += val;
        finalDetails[uid] = val;
      }
      const enteredAmount = parseFloat(amount);
      const isUSD = currency.toUpperCase() === 'USD';
      if (Math.abs(totalSplit - (enteredAmount * (isUSD ? 83.0 : 1))) > 1.0) {
        return setFormError(`Sum of unequal shares (₹${totalSplit}) does not match total (₹${enteredAmount * (isUSD ? 83.0 : 1)})`);
      }
    }

    setSubmitting(true);
    try {
      const result = await dispatch(createExpense({
        groupId: Number(groupId),
        description,
        amount: parseFloat(amount),
        currency,
        paidById: payerIdNum,
        expenseDate: new Date(expenseDate).toISOString(),
        splitType,
        splitWith: selectedSplitIds,
        splitDetails: finalDetails
      }));

      if (result.meta?.requestStatus === 'rejected') {
        setFormError(result.payload || 'Failed to add expense. Please try again.');
        setSubmitting(false);
      } else {
        // Refresh the expense list to reflect the new entry
        dispatch(fetchExpenses(Number(groupId)));
        onClose();
      }
    } catch (err) {
      setFormError('Unexpected error. Please try again.');
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in font-sans">
      <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden">
        <div className="px-6 py-4 bg-brand-light border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-bold font-serif text-slate-800 text-lg">Add New Expense</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl font-bold cursor-pointer">×</button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {formError && (
            <div className="bg-rose-50 border-l-4 border-rose-400 p-3 rounded text-xs font-semibold text-rose-700">
              {formError}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Description</label>
              <input
                type="text"
                required
                placeholder="Rent, Groceries, etc."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:ring-1 focus:ring-brand focus:border-brand"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Amount</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  step="any"
                  required
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:ring-1 focus:ring-brand focus:border-brand"
                />
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="text-sm border border-slate-300 rounded-lg px-2 py-2 bg-white"
                >
                  <option value="INR">INR (₹)</option>
                  <option value="USD">USD ($)</option>
                </select>
              </div>
              {currency === 'USD' && amount && (
                <span className="text-[10px] text-brand font-bold block mt-1">
                  Est. in INR: ₹{(parseFloat(amount) * 83).toFixed(2)} (@ ₹83/$)
                </span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Date</label>
              <input
                type="date"
                required
                value={expenseDate}
                onChange={(e) => setExpenseDate(e.target.value)}
                className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Paid By</label>
              <select
                value={paidById}
                required
                onChange={(e) => setPaidById(e.target.value)}
                className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 bg-white"
              >
                <option value="">Select Payer</option>
                {activeMembers.map(u => (
                  <option key={u.id} value={u.id}>{u.username}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Split Type</label>
            <div className="grid grid-cols-4 gap-2">
              {['equal', 'percentage', 'share', 'unequal'].map(type => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setSplitType(type)}
                  className={`py-1.5 text-xs font-bold rounded-lg border capitalize transition-colors cursor-pointer ${splitType === type ? 'bg-brand border-brand text-white shadow-xs' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          <div className="border-t border-slate-100 pt-4">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Split Participants & Weighting</label>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {activeMembers.map(u => {
                const isChecked = selectedSplitIds.includes(u.id);
                return (
                  <div key={u.id} className="flex items-center justify-between py-1">
                    <label className="flex items-center gap-3 text-sm cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => handleCheckboxChange(u.id)}
                        className="rounded border-slate-300 text-brand focus:ring-brand h-4 w-4"
                      />
                      <span className="font-semibold text-slate-700">{u.username}</span>
                    </label>

                    {isChecked && splitType !== 'equal' && (
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          step="any"
                          required
                          placeholder={splitType === 'percentage' ? '%' : splitType === 'share' ? 'share' : '₹ amount'}
                          value={splitDetails[u.id] || ''}
                          onChange={(e) => handleDetailChange(u.id, e.target.value)}
                          className="w-24 text-right text-xs border border-slate-300 rounded px-2 py-1 focus:ring-brand"
                        />
                        <span className="text-xs text-slate-500 font-bold">
                          {splitType === 'percentage' ? '%' : splitType === 'share' ? 'shares' : 'INR'}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex gap-3 justify-end pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 border border-slate-200 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 bg-brand hover:bg-brand-dark text-white rounded-lg text-xs font-bold shadow-md shadow-brand/20 cursor-pointer disabled:opacity-60 flex items-center gap-2"
            >
              {submitting ? (
                <><span className="animate-spin inline-block w-3 h-3 border-2 border-white border-t-transparent rounded-full"></span> Saving...</>
              ) : 'Add Expense'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddExpenseForm;
