import express from 'express';
import { db } from '../db/index.js';
import { settlements, users } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { verifyToken } from '../middleware/auth.js';

const router = express.Router();

// Record a settlement payment
router.post('/settlements', verifyToken, async (req, res) => {
  const { groupId, payerId, payeeId, amount, settlementDate } = req.body;

  if (!groupId || !payerId || !payeeId || !amount || !settlementDate) {
    return res.status(400).json({ error: 'Missing required settlement fields' });
  }

  const parsedAmount = parseFloat(amount);
  if (isNaN(parsedAmount) || parsedAmount <= 0) {
    return res.status(400).json({ error: 'Amount must be a positive number' });
  }

  try {
    const [settlement] = await db
      .insert(settlements)
      .values({
        groupId: parseInt(groupId),
        payerId: parseInt(payerId),
        payeeId: parseInt(payeeId),
        amount: parsedAmount.toString(),
        settlementDate: new Date(settlementDate)
      })
      .returning();

    const [payerUser] = await db
      .select({ username: users.username })
      .from(users)
      .where(eq(users.id, settlement.payerId))
      .limit(1);

    const [payeeUser] = await db
      .select({ username: users.username })
      .from(users)
      .where(eq(users.id, settlement.payeeId))
      .limit(1);

    res.status(201).json({
      id: settlement.id,
      groupId: settlement.groupId,
      payerId: settlement.payerId,
      payerName: payerUser.username,
      payeeId: settlement.payeeId,
      payeeName: payeeUser.username,
      amount: Number(settlement.amount),
      settlementDate: settlement.settlementDate
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error recording settlement' });
  }
});

export default router;
