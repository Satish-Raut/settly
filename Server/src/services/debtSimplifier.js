export function simplifyDebts(userBalances) {
  // Input: array of { userId, username, netBalance }
  
  // Separate into debtors (negative balance) and creditors (positive balance)
  let debtors = userBalances
    .filter(u => u.netBalance < -0.01)
    .map(u => ({
      userId: u.userId,
      username: u.username,
      balance: Math.abs(u.netBalance)
    }));

  let creditors = userBalances
    .filter(u => u.netBalance > 0.01)
    .map(u => ({
      userId: u.userId,
      username: u.username,
      balance: u.netBalance
    }));

  const transactions = [];

  while (debtors.length > 0 && creditors.length > 0) {
    // Sort descending by balance to match the largest debtors and creditors first (greedy)
    debtors.sort((a, b) => b.balance - a.balance);
    creditors.sort((a, b) => b.balance - a.balance);

    const debtor = debtors[0];
    const creditor = creditors[0];

    const settlementAmount = Math.min(debtor.balance, creditor.balance);
    
    transactions.push({
      fromId: debtor.userId,
      fromName: debtor.username,
      toId: creditor.userId,
      toName: creditor.username,
      amount: Math.round(settlementAmount * 100) / 100
    });

    debtor.balance -= settlementAmount;
    creditor.balance -= settlementAmount;

    // Remove users who have been fully settled
    if (debtor.balance < 0.01) debtors.shift();
    if (creditor.balance < 0.01) creditors.shift();
  }

  return transactions;
}
