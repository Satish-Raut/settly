import express from 'express';
import { db } from '../db/index.js';
import { groupMemberships, expenses, expenseSplits, settlements, users } from '../db/schema.js';
import { eq, inArray } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { verifyToken } from '../middleware/auth.js';
import { simplifyDebts } from '../services/debtSimplifier.js';

const router = express.Router();

// Retrieve group balance calculations and debt simplification
router.get('/groups/:groupId/balances', verifyToken, async (req, res) => {
  const groupId = parseInt(req.params.groupId);
  if (isNaN(groupId)) return res.status(400).json({ error: 'Invalid Group ID' });

  try {
    // 1. Fetch group memberships
    const memberships = await db
      .select({
        groupId: groupMemberships.groupId,
        userId: groupMemberships.userId,
        joinedAt: groupMemberships.joinedAt,
        leftAt: groupMemberships.leftAt,
        username: users.username,
        email: users.email
      })
      .from(groupMemberships)
      .innerJoin(users, eq(groupMemberships.userId, users.id))
      .where(eq(groupMemberships.groupId, groupId));

    if (memberships.length === 0) {
      return res.status(404).json({ error: 'Group memberships not found' });
    }

    // 2. Fetch expenses
    const exps = await db
      .select({
        id: expenses.id,
        description: expenses.description,
        amount: expenses.amount,
        amountInINR: expenses.amountInINR,
        currency: expenses.currency,
        paidById: expenses.paidById,
        expenseDate: expenses.expenseDate,
        splitType: expenses.splitType,
        payerName: users.username
      })
      .from(expenses)
      .innerJoin(users, eq(expenses.paidById, users.id))
      .where(eq(expenses.groupId, groupId));

    // 3. Fetch splits if there are expenses
    let splits = [];
    if (exps.length > 0) {
      const expenseIds = exps.map(e => e.id);
      splits = await db
        .select({
          expenseId: expenseSplits.expenseId,
          userId: expenseSplits.userId,
          shareAmount: expenseSplits.shareAmount,
          username: users.username
        })
        .from(expenseSplits)
        .innerJoin(users, eq(expenseSplits.userId, users.id))
        .where(inArray(expenseSplits.expenseId, expenseIds));
    }

    // 4. Fetch settlements with alias joins for payer & payee usernames
    const payers = alias(users, 'payers');
    const payees = alias(users, 'payees');
    
    const setts = await db
      .select({
        id: settlements.id,
        payerId: settlements.payerId,
        payeeId: settlements.payeeId,
        amount: settlements.amount,
        settlementDate: settlements.settlementDate,
        payerName: payers.username,
        payeeName: payees.username
      })
      .from(settlements)
      .innerJoin(payers, eq(settlements.payerId, payers.id))
      .innerJoin(payees, eq(settlements.payeeId, payees.id))
      .where(eq(settlements.groupId, groupId));

    // 5. Compute balances
    const balanceMap = {};
    memberships.forEach(m => {
      balanceMap[m.userId] = 0.0;
    });

    const auditTrails = [];

    // Process expenses
    exps.forEach(exp => {
      const paidById = exp.paidById;
      const amountInINR = Number(exp.amountInINR);

      // Payer credit
      if (balanceMap[paidById] !== undefined) {
        balanceMap[paidById] += amountInINR;
      }

      // Splits debit
      const expSplits = splits.filter(s => s.expenseId === exp.id);
      const formattedSplits = [];

      expSplits.forEach(s => {
        const shareAmount = Number(s.shareAmount);
        if (balanceMap[s.userId] !== undefined) {
          balanceMap[s.userId] -= shareAmount;
        }

        formattedSplits.push({
          userId: s.userId,
          username: s.username,
          shareAmount
        });
      });

      auditTrails.push({
        expenseId: exp.id,
        description: exp.description,
        amount: Number(exp.amount),
        amountInINR,
        currency: exp.currency,
        paidBy: exp.payerName,
        date: exp.expenseDate,
        splitType: exp.splitType,
        splits: formattedSplits
      });
    });

    // Process settlements
    setts.forEach(settle => {
      const payerId = settle.payerId;
      const payeeId = settle.payeeId;
      const amount = Number(settle.amount);

      if (balanceMap[payerId] !== undefined) {
        balanceMap[payerId] += amount;
      }
      if (balanceMap[payeeId] !== undefined) {
        balanceMap[payeeId] -= amount;
      }
    });

    // 6. Net balances list
    const netBalances = memberships.map(m => ({
      userId: m.userId,
      username: m.username,
      netBalance: Math.round((balanceMap[m.userId] || 0) * 100) / 100
    }));

    // 7. Simplify cash flows
    const simplifiedDebts = simplifyDebts(netBalances);

    res.json({
      balanceMap,
      netBalances,
      simplifiedDebts,
      auditTrails
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error computing group balances' });
  }
});

export default router;
