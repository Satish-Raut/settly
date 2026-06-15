
import express from 'express';
import multer from 'multer';
import { db } from '../db/index.js';
import { csvImports, stagedExpenses, csvAnomalies, groups, groupMemberships, expenses, expenseSplits, settlements, users } from '../db/schema.js';
import { eq, and } from 'drizzle-orm';
import { verifyToken } from '../middleware/auth.js';
import { parseAndAuditCSV, resolveUserAlias } from '../services/csvPipeline.js';
import { calculateSplits } from '../services/splitEngine.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

const USD_TO_INR = 83.0;

// Upload CSV and audit
router.post('/import/csv', verifyToken, upload.single('file'), async (req, res) => {
  const { groupId } = req.body;
  if (!req.file) return res.status(400).json({ error: 'No CSV file uploaded' });
  if (!groupId) return res.status(400).json({ error: 'Group ID is required' });

  const parsedGroupId = parseInt(groupId);

  try {
    // 1. Fetch group memberships
    const memberships = await db
      .select()
      .from(groupMemberships)
      .where(eq(groupMemberships.groupId, parsedGroupId));

    if (memberships.length === 0) return res.status(404).json({ error: 'Group or memberships not found' });

    // 2. Fetch all registered users
    const allUsers = await db.select().from(users);

    // 3. Parse and audit CSV text
    const csvText = req.file.buffer.toString('utf-8');
    const auditedRows = await parseAndAuditCSV(csvText, allUsers, memberships);

    // 4. Create import session
    const [importSession] = await db
      .insert(csvImports)
      .values({
        groupId: parsedGroupId,
        filename: req.file.originalname,
        status: 'PENDING'
      })
      .returning();

    // 5. Staging records insertion
    const stagedExpensesList = [];
    const anomaliesList = [];

    for (const row of auditedRows) {
      const [staged] = await db
        .insert(stagedExpenses)
        .values({
          importId: importSession.id,
          rowNumber: row.rowNumber,
          date: row.dateString ? new Date(row.dateString) : new Date(),
          description: row.description,
          amount: row.amount.toString(),
          currency: row.currency,
          paidBy: row.paidById ? allUsers.find(u => u.id === row.paidById).username : (row.paidBy || ''),
          splitType: row.splitType,
          splitWith: row.splitWith,
          splitDetails: row.splitDetails,
          isFlagged: row.isFlagged
        })
        .returning();

      // Save anomalies
      const savedAnomalies = [];
      for (const a of row.anomalies) {
        const [anomaly] = await db
          .insert(csvAnomalies)
          .values({
            stagedExpenseId: staged.id,
            anomalyType: a.anomalyType,
            severity: a.severity,
            description: a.description
          })
          .returning();
        
        savedAnomalies.push({
          id: anomaly.id,
          anomalyType: anomaly.anomalyType,
          severity: anomaly.severity,
          description: anomaly.description
        });

        anomaliesList.push({
          ...anomaly,
          stagedExpenseId: staged.id,
          rowNumber: staged.rowNumber,
          description: staged.description
        });
      }

      stagedExpensesList.push({
        id: staged.id,
        rowNumber: staged.rowNumber,
        date: staged.date,
        description: staged.description,
        amount: Number(staged.amount),
        currency: staged.currency,
        paidBy: staged.paidBy,
        splitType: staged.splitType,
        splitWith: staged.splitWith,
        splitDetails: staged.splitDetails,
        isFlagged: staged.isFlagged,
        anomalies: savedAnomalies
      });
    }

    res.json({
      importSession: {
        id: importSession.id,
        groupId: importSession.groupId,
        filename: importSession.filename,
        importedAt: importSession.importedAt,
        status: importSession.status
      },
      stagedExpenses: stagedExpensesList,
      anomalies: anomaliesList
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error processing CSV file' });
  }
});

// Finalize import: applies resolved decisions into the core database
router.post('/import/:importId/finalize', verifyToken, async (req, res) => {
  const importId = parseInt(req.params.importId);
  const { resolutions } = req.body;

  if (isNaN(importId)) return res.status(400).json({ error: 'Invalid Import ID' });

  try {
    // 1. Fetch import session and staged rows
    const [importSession] = await db
      .select()
      .from(csvImports)
      .where(eq(csvImports.id, importId))
      .limit(1);

    if (!importSession) return res.status(404).json({ error: 'Import session not found' });
    if (importSession.status !== 'PENDING') {
      return res.status(400).json({ error: 'Import session is already finalized or failed' });
    }

    const stagedRowsList = await db
      .select()
      .from(stagedExpenses)
      .where(eq(stagedExpenses.importId, importId));

    const memberships = await db
      .select()
      .from(groupMemberships)
      .where(eq(groupMemberships.groupId, importSession.groupId));

    const allUsers = await db.select().from(users);

    const importReport = [];
    let savedCount = 0;
    let skippedCount = 0;

    // 2. Perform transaction to insert into actual ledger and update statuses
    await db.transaction(async (tx) => {
      for (const staged of stagedRowsList) {
        const resolution = resolutions ? resolutions[staged.id] : null;

        // If explicitly set to skip
        if (resolution && resolution.choice === 'skip') {
          skippedCount++;
          importReport.push(`Row ${staged.rowNumber} (${staged.description}): Excluded / Skipped by user resolution.`);
          
          await tx
            .update(csvAnomalies)
            .set({ isResolved: true, resolutionAction: 'SKIPPED' })
            .where(eq(csvAnomalies.stagedExpenseId, staged.id));
          
          continue;
        }

        // Determine actual values (resolutions can overwrite staged values)
        const finalDescription = staged.description;
        const finalAmount = resolution && resolution.amount !== undefined ? parseFloat(resolution.amount) : Number(staged.amount);
        const finalCurrency = resolution && resolution.currency ? resolution.currency : staged.currency;
        const finalDate = resolution && resolution.date ? new Date(resolution.date) : staged.date;
        const finalPaidByName = resolution && resolution.paidBy ? resolution.paidBy : staged.paidBy;
        
        // Resolve user record for paidBy
        const resolvedPayer = resolveUserAlias(finalPaidByName, allUsers);
        if (!resolvedPayer) {
          throw new Error(`Row ${staged.rowNumber}: Unable to resolve payer name '${finalPaidByName}' to a registered user.`);
        }

        // Determine split participants
        const rawSplitWith = resolution && resolution.splitWith ? resolution.splitWith : staged.splitWith;
        const finalSplitNames = rawSplitWith.split(';').map(n => n.trim()).filter(Boolean);
        const finalSplitIds = [];
        
        for (const name of finalSplitNames) {
          const resolved = resolveUserAlias(name, allUsers);
          if (!resolved) {
            throw new Error(`Row ${staged.rowNumber}: Unable to resolve split participant '${name}' to a registered user.`);
          }
          finalSplitIds.push(resolved.id);
        }

        const rawSplitDetails = resolution && resolution.splitDetails ? resolution.splitDetails : staged.splitDetails;
        const finalSplitDetails = {};
        
        if (rawSplitDetails) {
          const parts = rawSplitDetails.split(';').map(p => p.trim()).filter(Boolean);
          parts.forEach(part => {
            const pctMatch = part.match(/([A-Za-z\s]+)\s+([0-9.]+)\%/);
            const numMatch = part.match(/([A-Za-z\s]+)\s+([0-9.]+)/);
            
            if (pctMatch) {
              const u = resolveUserAlias(pctMatch[1], allUsers);
              if (u) finalSplitDetails[u.id] = parseFloat(pctMatch[2]);
            } else if (numMatch) {
              const u = resolveUserAlias(numMatch[1], allUsers);
              if (u) finalSplitDetails[u.id] = parseFloat(numMatch[2]);
            }
          });
        }

        const isUSD = finalCurrency.toUpperCase() === 'USD';
        const exchangeRate = isUSD ? USD_TO_INR : 1.0;
        const amountInINR = finalAmount * exchangeRate;

        // Check if description implies it is a Settlement
        const descLower = finalDescription.toLowerCase();
        const isSettlement =
          descLower.includes('paid') ||
          descLower.includes('settle') ||
          descLower.includes('deposit') ||
          descLower.includes('paid back');

        if (isSettlement) {
          const payeeId = finalSplitIds[0] || resolvedPayer.id;
          
          await tx.insert(settlements).values({
            groupId: importSession.groupId,
            payerId: resolvedPayer.id,
            payeeId,
            amount: finalAmount.toString(),
            settlementDate: finalDate
          });

          importReport.push(`Row ${staged.rowNumber}: Imported as a cash settlement: ${resolvedPayer.username} paid ${allUsers.find(u => u.id === payeeId).username} ${finalCurrency} ${finalAmount}`);
        } else {
          // Calculate splits
          const splitsList = calculateSplits(
            amountInINR,
            finalDate,
            staged.splitType || 'equal',
            finalSplitIds,
            finalSplitDetails,
            memberships
          );

          const [createdExpense] = await tx
            .insert(expenses)
            .values({
              groupId: importSession.groupId,
              paidById: resolvedPayer.id,
              description: finalDescription,
              amount: finalAmount.toString(),
              currency: finalCurrency,
              exchangeRate: exchangeRate.toString(),
              amountInINR: amountInINR.toString(),
              expenseDate: finalDate,
              splitType: staged.splitType || 'equal'
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

          importReport.push(`Row ${staged.rowNumber}: Imported expense '${finalDescription}' (${finalCurrency} ${finalAmount}) split among: ${finalSplitNames.join(', ')}`);
        }

        savedCount++;

        // Mark staging anomalies as resolved
        await tx
          .update(csvAnomalies)
          .set({ isResolved: true, resolutionAction: 'RESOLVED_AND_IMPORTED' })
          .where(eq(csvAnomalies.stagedExpenseId, staged.id));
      }

      // Mark import session as COMPLETED
      await tx
        .update(csvImports)
        .set({ status: 'COMPLETED' })
        .where(eq(csvImports.id, importId));
    });

    res.json({
      success: true,
      importSessionId: importId,
      status: 'COMPLETED',
      savedCount,
      skippedCount,
      report: importReport.join('\n')
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || 'Server error finalizing CSV import' });
  }
});

export default router;
