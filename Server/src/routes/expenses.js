import express from 'express';
import { db } from '../db/index.js';
import { expenses, expenseSplits, groupMemberships, users } from '../db/schema.js';
import { eq, and, inArray } from 'drizzle-orm';
import { verifyToken } from '../middleware/auth.js';
import { calculateSplits } from '../services/splitEngine.js';

const router = express.Router();
const USD_TO_INR = 83.0;

// Fetch full expenses ledger with splits for a group
router.get('/groups/:groupId/expenses', verifyToken, async (req, res) => {
  const groupId = parseInt(req.params.groupId);
  if (isNaN(groupId)) return res.status(400).json({ error: 'Invalid Group ID' });

  try {
    // 1. Fetch expenses for this group
    const exps = await db
      .select({
        id: expenses.id,
        groupId: expenses.groupId,
        description: expenses.description,
        amount: expenses.amount,
        currency: expenses.currency,
        exchangeRate: expenses.exchangeRate,
        amountInINR: expenses.amountInINR,
        paidById: expenses.paidById,
        expenseDate: expenses.expenseDate,
        splitType: expenses.splitType,
        paidByName: users.username
      })
      .from(expenses)
      .innerJoin(users, eq(expenses.paidById, users.id))
      .where(eq(expenses.groupId, groupId))
      .orderBy(expenses.expenseDate);

    if (exps.length === 0) {
      return res.json([]);
    }

    const expenseIds = exps.map(e => e.id);

    // 2. Fetch splits for all these expenses
    const splits = await db
      .select({
        id: expenseSplits.id,
        expenseId: expenseSplits.expenseId,
        userId: expenseSplits.userId,
        shareAmount: expenseSplits.shareAmount,
        percentage: expenseSplits.percentage,
        username: users.username
      })
      .from(expenseSplits)
      .innerJoin(users, eq(expenseSplits.userId, users.id))
      .where(inArray(expenseSplits.expenseId, expenseIds));

    // 3. Format to expected Redux structure
    const formatted = exps.map(exp => {
      const expSplits = splits.filter(s => s.expenseId === exp.id);
      const splitWith = expSplits.map(s => s.userId);
      const splitDetails = {};
      
      expSplits.forEach(s => {
        if (exp.splitType === 'percentage') {
          splitDetails[s.userId] = s.percentage ? Number(s.percentage) : 0;
        } else if (exp.splitType === 'share' || exp.splitType === 'unequal') {
          splitDetails[s.userId] = Number(s.shareAmount);
        }
      });

      return {
        id: exp.id,
        groupId: exp.groupId,
        description: exp.description,
        amount: Number(exp.amount),
        currency: exp.currency,
        exchangeRate: Number(exp.exchangeRate),
        amountInINR: Number(exp.amountInINR),
        paidById: exp.paidById,
        paidByName: exp.paidByName,
        expenseDate: exp.expenseDate,
        splitType: exp.splitType,
        splitWith,
        splitDetails,
        splits: expSplits.map(s => ({
          userId: s.userId,
          username: s.username,
          shareAmount: Number(s.shareAmount),
          percentage: s.percentage ? Number(s.percentage) : null
        }))
      };
    });

    res.json(formatted);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error fetching expenses ledger' });
  }
});

// Add a new expense
router.post('/expenses', verifyToken, async (req, res) => {
  const {
    groupId,
    description,
    amount,
    currency,
    paidById,
    expenseDate,
    splitType,
    splitWith,
    splitDetails
  } = req.body;

  if (!groupId || !description || !amount || !currency || !paidById || !expenseDate || !splitType || !splitWith) {
    return res.status(400).json({ error: 'Missing required expense fields' });
  }

  const parsedAmount = parseFloat(amount);
  if (isNaN(parsedAmount) || parsedAmount <= 0) {
    return res.status(400).json({ error: 'Amount must be a positive number' });
  }

  try {
    // 1. Fetch group memberships timeline
    const memberships = await db
      .select()
      .from(groupMemberships)
      .where(eq(groupMemberships.groupId, groupId));

    if (memberships.length === 0) return res.status(404).json({ error: 'Group or memberships not found' });

    // 2. Run splitting engine calculations
    let splitsList;
    try {
      splitsList = calculateSplits(
        parsedAmount,
        expenseDate,
        splitType,
        splitWith.map(id => parseInt(id)),
        splitDetails || {},
        memberships
      );
    } catch (calcError) {
      return res.status(400).json({ error: calcError.message });
    }

    // 3. Multi-currency setup
    const isUSD = currency.toUpperCase() === 'USD';
    const exchangeRate = isUSD ? USD_TO_INR : 1.0;
    const amountInINR = parsedAmount * exchangeRate;

    // 4. Save Expense + Splits in transaction
    const savedExpense = await db.transaction(async (tx) => {
      const [createdExpense] = await tx
        .insert(expenses)
        .values({
          groupId,
          paidById: parseInt(paidById),
          description: description.trim(),
          amount: parsedAmount.toString(),
          currency: currency.toUpperCase(),
          exchangeRate: exchangeRate.toString(),
          amountInINR: amountInINR.toString(),
          expenseDate: new Date(expenseDate),
          splitType
        })
        .returning();

      for (const split of splitsList) {
        await tx.insert(expenseSplits).values({
          expenseId: createdExpense.id,
          userId: split.userId,
          shareAmount: split.shareAmount.toString(),
          percentage: split.percentage ? split.percentage.toString() : null
        });
      }

      return createdExpense;
    });

    // 5. Query complete expense with relations to return
    const [payerUser] = await db
      .select({ username: users.username })
      .from(users)
      .where(eq(users.id, savedExpense.paidById))
      .limit(1);

    const savedSplits = await db
      .select({
        userId: expenseSplits.userId,
        shareAmount: expenseSplits.shareAmount,
        username: users.username
      })
      .from(expenseSplits)
      .innerJoin(users, eq(expenseSplits.userId, users.id))
      .where(eq(expenseSplits.expenseId, savedExpense.id));

    res.status(201).json({
      id: savedExpense.id,
      groupId: savedExpense.groupId,
      description: savedExpense.description,
      amount: Number(savedExpense.amount),
      currency: savedExpense.currency,
      exchangeRate: Number(savedExpense.exchangeRate),
      amountInINR: Number(savedExpense.amountInINR),
      paidById: savedExpense.paidById,
      paidByName: payerUser.username,
      expenseDate: savedExpense.expenseDate,
      splitWith: savedSplits.map(s => s.userId),
      splits: savedSplits.map(s => ({
        userId: s.userId,
        username: s.username,
        shareAmount: Number(s.shareAmount)
      }))
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error adding expense' });
  }
});

// Delete an expense
router.delete('/expenses/:id', verifyToken, async (req, res) => {
  const expenseId = parseInt(req.params.id);
  if (isNaN(expenseId)) return res.status(400).json({ error: 'Invalid Expense ID' });

  try {
    const existing = await db
      .select()
      .from(expenses)
      .where(eq(expenses.id, expenseId))
      .limit(1);

    if (existing.length === 0) return res.status(404).json({ error: 'Expense not found' });

    // Cascading deletes of expense_splits is managed at database constraint level
    await db.delete(expenses).where(eq(expenses.id, expenseId));

    res.json({ success: true, message: 'Expense deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error deleting expense' });
  }
});

export default router;
