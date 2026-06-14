import { createSlice } from '@reduxjs/toolkit';

// Standard fixed exchange rate for USD to INR
const USD_TO_INR = 83.0;

// Initial clean expenses from February (already verified and resolved)
const initialExpenses = [
  {
    id: 1,
    groupId: 1,
    description: 'February rent',
    amount: 48000,
    currency: 'INR',
    exchangeRate: 1.0,
    amountInINR: 48000,
    paidById: 1, // Aisha
    expenseDate: '2026-02-01T12:00:00.000Z',
    splitType: 'equal',
    splitWith: [1, 2, 3, 4], // Aisha, Rohan, Priya, Meera
    splitDetails: {}
  },
  {
    id: 2,
    groupId: 1,
    description: 'Groceries BigBasket',
    amount: 2340,
    currency: 'INR',
    exchangeRate: 1.0,
    amountInINR: 2340,
    paidById: 3, // Priya
    expenseDate: '2026-02-03T12:00:00.000Z',
    splitType: 'equal',
    splitWith: [1, 2, 3, 4],
    splitDetails: {}
  },
  {
    id: 3,
    groupId: 1,
    description: 'Wifi bill Feb',
    amount: 1199,
    currency: 'INR',
    exchangeRate: 1.0,
    amountInINR: 1199,
    paidById: 2, // Rohan
    expenseDate: '2026-02-05T12:00:00.000Z',
    splitType: 'equal',
    splitWith: [1, 2, 3, 4],
    splitDetails: {}
  },
  {
    id: 4,
    groupId: 1,
    description: 'Electricity Feb',
    amount: 1200,
    currency: 'INR',
    exchangeRate: 1.0,
    amountInINR: 1200,
    paidById: 1, // Aisha
    expenseDate: '2026-02-10T12:00:00.000Z',
    splitType: 'equal',
    splitWith: [1, 2, 3, 4],
    splitDetails: {}
  },
  {
    id: 5,
    groupId: 1,
    description: 'Maid salary Feb',
    amount: 3000,
    currency: 'INR',
    exchangeRate: 1.0,
    amountInINR: 3000,
    paidById: 4, // Meera
    expenseDate: '2026-02-12T12:00:00.000Z',
    splitType: 'equal',
    splitWith: [1, 2, 3, 4],
    splitDetails: {}
  },
  {
    id: 6,
    groupId: 1,
    description: 'Cylinder refill',
    amount: 900.00,
    currency: 'INR',
    exchangeRate: 1.0,
    amountInINR: 900.00,
    paidById: 2, // Rohan
    expenseDate: '2026-02-15T12:00:00.000Z',
    splitType: 'equal',
    splitWith: [1, 2, 3, 4],
    splitDetails: {}
  }
];

// Initial settlements (e.g. Row 14: Rohan paid Aisha back)
const initialSettlements = [
  {
    id: 1,
    groupId: 1,
    payerId: 2, // Rohan
    payeeId: 1, // Aisha
    amount: 5000,
    settlementDate: '2026-02-25T12:00:00.000Z'
  }
];

const expensesSlice = createSlice({
  name: 'expenses',
  initialState: {
    expenses: initialExpenses,
    settlements: initialSettlements,
    loading: false,
    error: null,
  },
  reducers: {
    addExpense: (state, action) => {
      const { description, amount, currency, paidById, expenseDate, splitType, splitWith, splitDetails, groupId } = action.payload;
      
      const amountVal = parseFloat(amount);
      const isUSD = currency.toUpperCase() === 'USD';
      const rate = isUSD ? USD_TO_INR : 1.0;
      const amountInINR = amountVal * rate;

      const newExpense = {
        id: state.expenses.length > 0 ? Math.max(...state.expenses.map(e => e.id)) + 1 : 1,
        groupId,
        description,
        amount: amountVal,
        currency: currency.toUpperCase(),
        exchangeRate: rate,
        amountInINR,
        paidById,
        expenseDate,
        splitType,
        splitWith, // array of userIds
        splitDetails: splitDetails || {}, // userIds mapped to percentage/shares/etc.
      };
      state.expenses.push(newExpense);
    },
    deleteExpense: (state, action) => {
      state.expenses = state.expenses.filter(e => e.id !== action.payload);
    },
    addSettlement: (state, action) => {
      const { payerId, payeeId, amount, settlementDate, groupId } = action.payload;
      const newSettlement = {
        id: state.settlements.length > 0 ? Math.max(...state.settlements.map(s => s.id)) + 1 : 1,
        groupId,
        payerId,
        payeeId,
        amount: parseFloat(amount),
        settlementDate
      };
      state.settlements.push(newSettlement);
    },
    bulkAddExpenses: (state, action) => {
      const { expenses, settlements } = action.payload;
      
      // Calculate start id for new items
      let expenseId = state.expenses.length > 0 ? Math.max(...state.expenses.map(e => e.id)) + 1 : 1;
      let settlementId = state.settlements.length > 0 ? Math.max(...state.settlements.map(s => s.id)) + 1 : 1;

      expenses.forEach(e => {
        state.expenses.push({
          ...e,
          id: expenseId++
        });
      });

      settlements.forEach(s => {
        state.settlements.push({
          ...s,
          id: settlementId++
        });
      });
    }
  }
});

// Selector helper: gets all active memberships on a specific date
export const selectActiveMembershipsOnDate = (memberships, dateString) => {
  const targetDate = new Date(dateString);
  return memberships.filter(m => {
    const joined = new Date(m.joinedAt);
    const left = m.leftAt ? new Date(m.leftAt) : null;
    return joined <= targetDate && (!left || targetDate <= left);
  });
};

// Main algorithm helper: calculates the splitting breakdown for a given expense
export const calculateExpenseSplits = (expense, memberships) => {
  const { amountInINR, splitType, splitWith, splitDetails, expenseDate } = expense;
  
  // Filter splitWith members based on active memberships on the expense date
  const activeMembersOnDate = selectActiveMembershipsOnDate(memberships, expenseDate);
  const activeUserIds = activeMembersOnDate.map(m => m.userId);
  const eligibleUserIds = splitWith.filter(uid => activeUserIds.includes(uid));

  if (eligibleUserIds.length === 0) return [];

  let splits = [];

  if (splitType === 'equal') {
    const count = eligibleUserIds.length;
    const rawShare = amountInINR / count;
    const roundedShare = Math.round(rawShare * 100) / 100;
    const totalAllocated = roundedShare * count;
    const remainder = Math.round((amountInINR - totalAllocated) * 100) / 100;

    eligibleUserIds.forEach((uid, idx) => {
      // Aisha/Rohan's math safety - give remainder to the first user
      const share = idx === 0 ? roundedShare + remainder : roundedShare;
      splits.push({ userId: uid, shareAmount: share });
    });
  } else if (splitType === 'percentage') {
    // splitDetails contains mapping: { [userId]: percentVal }
    let totalPercent = 0;
    eligibleUserIds.forEach(uid => {
      totalPercent += parseFloat(splitDetails[uid] || 0);
    });

    eligibleUserIds.forEach(uid => {
      const userPercent = parseFloat(splitDetails[uid] || 0);
      const rawShare = (amountInINR * userPercent) / (totalPercent || 100);
      splits.push({ userId: uid, shareAmount: Math.round(rawShare * 100) / 100 });
    });
  } else if (splitType === 'share') {
    // splitDetails contains mapping: { [userId]: shareRatio }
    let totalShares = 0;
    eligibleUserIds.forEach(uid => {
      totalShares += parseFloat(splitDetails[uid] || 0);
    });

    eligibleUserIds.forEach(uid => {
      const userRatio = parseFloat(splitDetails[uid] || 0);
      const rawShare = amountInINR * (userRatio / (totalShares || 1));
      splits.push({ userId: uid, shareAmount: Math.round(rawShare * 100) / 100 });
    });
  } else if (splitType === 'unequal') {
    // splitDetails contains mapping: { [userId]: absoluteAmount }
    // Note: absolute amounts should already represent the amount in INR
    eligibleUserIds.forEach(uid => {
      const share = parseFloat(splitDetails[uid] || 0);
      splits.push({ userId: uid, shareAmount: share });
    });
  }

  return splits;
};

// Calculations Selector: Computes balances, transactions, and simplification
export const selectBalancesForGroup = (state, groupId) => {
  const expenses = state.expenses.expenses.filter(e => e.groupId === groupId);
  const settlements = state.expenses.settlements.filter(s => s.groupId === groupId);
  
  // Find group memberships
  const group = state.groups.groups.find(g => g.id === groupId);
  if (!group) return { balances: {}, netBalances: [], simplifiedDebts: [], auditTrails: [] };
  const memberships = group.memberships;
  const users = state.auth.users;

  // Track who paid what, and who owes what
  // balanceMap: { [userId]: netBalance }
  const balanceMap = {};
  users.forEach(u => {
    balanceMap[u.id] = 0;
  });

  const auditTrails = [];

  expenses.forEach(exp => {
    const paidBy = exp.paidById;
    const amount = exp.amountInINR;
    
    // Add payment credit to payer
    balanceMap[paidBy] += amount;

    // Calculate splits
    const splits = calculateExpenseSplits(exp, memberships);
    splits.forEach(split => {
      balanceMap[split.userId] -= split.shareAmount;
    });

    auditTrails.push({
      expenseId: exp.id,
      description: exp.description,
      amount: exp.amount,
      amountInINR: exp.amountInINR,
      currency: exp.currency,
      paidBy: users.find(u => u.id === paidBy)?.username || 'Unknown',
      date: exp.expenseDate,
      splitType: exp.splitType,
      splits: splits.map(s => ({
        userId: s.userId,
        username: users.find(u => u.id === s.userId)?.username || 'Unknown',
        shareAmount: s.shareAmount
      }))
    });
  });

  // Factor in settlements
  settlements.forEach(settle => {
    // Payer gives money, payee receives money
    // Payer balance increases (they spent money on settlement)
    // Payee balance decreases (they received money, so they are owed less)
    balanceMap[settle.payerId] += settle.amount;
    balanceMap[settle.payeeId] -= settle.amount;
  });

  // Format balances list
  const netBalances = users.map(u => ({
    userId: u.id,
    username: u.username,
    netBalance: Math.round(balanceMap[u.id] * 100) / 100
  })).filter(u => {
    // Show only users who have memberships in the group at some point
    return memberships.some(m => m.userId === u.userId);
  });

  // Simplification Algorithm
  // Debt Simplification (Minimizing Cash Flow)
  const simplifiedDebts = [];
  
  // Create debtors and creditors copies
  let debtors = netBalances.filter(b => b.netBalance < -0.01).map(b => ({ ...b, balance: Math.abs(b.netBalance) }));
  let creditors = netBalances.filter(b => b.netBalance > 0.01).map(b => ({ ...b, balance: b.netBalance }));

  while (debtors.length > 0 && creditors.length > 0) {
    // Sort descending
    debtors.sort((a, b) => b.balance - a.balance);
    creditors.sort((a, b) => b.balance - a.balance);

    const debtor = debtors[0];
    const creditor = creditors[0];

    const settlementAmount = Math.min(debtor.balance, creditor.balance);
    
    simplifiedDebts.push({
      fromId: debtor.userId,
      fromName: debtor.username,
      toId: creditor.userId,
      toName: creditor.username,
      amount: Math.round(settlementAmount * 100) / 100
    });

    debtor.balance -= settlementAmount;
    creditor.balance -= settlementAmount;

    if (debtor.balance < 0.01) debtors.shift();
    if (creditor.balance < 0.01) creditors.shift();
  }

  return {
    balanceMap,
    netBalances,
    simplifiedDebts,
    auditTrails
  };
};

export const { addExpense, deleteExpense, addSettlement, bulkAddExpenses } = expensesSlice.actions;
export default expensesSlice.reducer;
