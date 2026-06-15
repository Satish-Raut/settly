import pg from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from './schema.js';
import { users, groups, groupMemberships, expenses, expenseSplits, settlements, csvImports, stagedExpenses, csvAnomalies } from './schema.js';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool, { schema });

async function main() {
  console.log('Clearing existing database data...');
  await db.delete(csvAnomalies);
  await db.delete(stagedExpenses);
  await db.delete(csvImports);
  await db.delete(settlements);
  await db.delete(expenseSplits);
  await db.delete(expenses);
  await db.delete(groupMemberships);
  await db.delete(groups);
  await db.delete(users);

  console.log('Seeding baseline users...');
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash('password123', salt);

  const usersData = [
    { id: 1, username: 'Aisha', email: 'aisha@settly.com', passwordHash },
    { id: 2, username: 'Rohan', email: 'rohan@settly.com', passwordHash },
    { id: 3, username: 'Priya', email: 'priya@settly.com', passwordHash },
    { id: 4, username: 'Meera', email: 'meera@settly.com', passwordHash },
    { id: 5, username: 'Sam', email: 'sam@settly.com', passwordHash },
    { id: 6, username: 'Dev', email: 'dev@settly.com', passwordHash }
  ];

  for (const u of usersData) {
    await db.insert(users).values(u);
  }
  console.log(`Seeded ${usersData.length} users.`);

  console.log('Seeding baseline group...');
  await db.insert(groups).values({
    id: 1,
    name: 'Flat 404 & Goa Trip',
    createdAt: new Date('2026-02-01T00:00:00.000Z')
  });
  console.log(`Seeded group.`);

  console.log('Seeding group memberships...');
  const membershipsData = [
    { groupId: 1, userId: 1, joinedAt: new Date('2026-02-01T00:00:00.000Z'), leftAt: null },
    { groupId: 1, userId: 2, joinedAt: new Date('2026-02-01T00:00:00.000Z'), leftAt: null },
    { groupId: 1, userId: 3, joinedAt: new Date('2026-02-01T00:00:00.000Z'), leftAt: null },
    { groupId: 1, userId: 4, joinedAt: new Date('2026-02-01T00:00:00.000Z'), leftAt: new Date('2026-03-29T23:59:59.999Z') },
    { groupId: 1, userId: 5, joinedAt: new Date('2026-04-10T00:00:00.000Z'), leftAt: null },
    { groupId: 1, userId: 6, joinedAt: new Date('2026-03-08T00:00:00.000Z'), leftAt: new Date('2026-03-15T23:59:59.999Z') }
  ];

  for (const m of membershipsData) {
    await db.insert(groupMemberships).values(m);
  }
  console.log('Seeded group memberships.');

  console.log('Seeding baseline expenses...');
  const expensesData = [
    {
      id: 1,
      groupId: 1,
      description: 'February rent',
      amount: '48000.00',
      currency: 'INR',
      exchangeRate: '1.0000',
      amountInINR: '48000.00',
      paidById: 1, // Aisha
      expenseDate: new Date('2026-02-01T12:00:00.000Z'),
      splitType: 'equal',
      splits: [1, 2, 3, 4]
    },
    {
      id: 2,
      groupId: 1,
      description: 'Groceries BigBasket',
      amount: '2340.00',
      currency: 'INR',
      exchangeRate: '1.0000',
      amountInINR: '2340.00',
      paidById: 3, // Priya
      expenseDate: new Date('2026-02-03T12:00:00.000Z'),
      splitType: 'equal',
      splits: [1, 2, 3, 4]
    },
    {
      id: 3,
      groupId: 1,
      description: 'Wifi bill Feb',
      amount: '1199.00',
      currency: 'INR',
      exchangeRate: '1.0000',
      amountInINR: '1199.00',
      paidById: 2, // Rohan
      expenseDate: new Date('2026-02-05T12:00:00.000Z'),
      splitType: 'equal',
      splits: [1, 2, 3, 4]
    },
    {
      id: 4,
      groupId: 1,
      description: 'Electricity Feb',
      amount: '1200.00',
      currency: 'INR',
      exchangeRate: '1.0000',
      amountInINR: '1200.00',
      paidById: 1, // Aisha
      expenseDate: new Date('2026-02-10T12:00:00.000Z'),
      splitType: 'equal',
      splits: [1, 2, 3, 4]
    },
    {
      id: 5,
      groupId: 1,
      description: 'Maid salary Feb',
      amount: '3000.00',
      currency: 'INR',
      exchangeRate: '1.0000',
      amountInINR: '3000.00',
      paidById: 4, // Meera
      expenseDate: new Date('2026-02-12T12:00:00.000Z'),
      splitType: 'equal',
      splits: [1, 2, 3, 4]
    },
    {
      id: 6,
      groupId: 1,
      description: 'Cylinder refill',
      amount: '900.00',
      currency: 'INR',
      exchangeRate: '1.0000',
      amountInINR: '900.00',
      paidById: 2, // Rohan
      expenseDate: new Date('2026-02-15T12:00:00.000Z'),
      splitType: 'equal',
      splits: [1, 2, 3, 4]
    }
  ];

  for (const exp of expensesData) {
    const { splits, ...expDetails } = exp;
    await db.insert(expenses).values(expDetails);

    const splitCount = splits.length;
    const amountVal = parseFloat(exp.amountInINR);
    const rawShare = amountVal / splitCount;
    const roundedShare = Math.round(rawShare * 100) / 100;
    const totalAllocated = roundedShare * splitCount;
    const remainder = Math.round((amountVal - totalAllocated) * 100) / 100;

    for (let i = 0; i < splitCount; i++) {
      const uid = splits[i];
      const shareAmount = i === 0 ? roundedShare + remainder : roundedShare;
      await db.insert(expenseSplits).values({
        expenseId: exp.id,
        userId: uid,
        shareAmount: shareAmount.toString()
      });
    }
  }
  console.log('Seeded baseline expenses and splits.');

  console.log('Seeding baseline settlements...');
  await db.insert(settlements).values({
    id: 1,
    groupId: 1,
    payerId: 2, // Rohan
    payeeId: 1, // Aisha
    amount: '5000.00',
    settlementDate: new Date('2026-02-25T12:00:00.000Z')
  });
  console.log('Seeded baseline settlements.');

  // Reset PostgreSQL sequences so new inserts don't clash with seeded explicit IDs
  console.log('Resetting sequences...');
  await pool.query(`SELECT setval(pg_get_serial_sequence('users', 'id'), (SELECT MAX(id) FROM users))`);
  await pool.query(`SELECT setval(pg_get_serial_sequence('groups', 'id'), (SELECT MAX(id) FROM groups))`);
  await pool.query(`SELECT setval(pg_get_serial_sequence('expenses', 'id'), (SELECT MAX(id) FROM expenses))`);
  await pool.query(`SELECT setval(pg_get_serial_sequence('settlements', 'id'), (SELECT MAX(id) FROM settlements))`);
  console.log('Sequences reset.');

  console.log('Database seeding complete!');
  await pool.end();
  process.exit(0);

}

main().catch(err => {
  console.error('Seeding error:', err);
  process.exit(1);
});
