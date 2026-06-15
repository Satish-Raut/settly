import { pgTable, serial, text, timestamp, decimal, integer, boolean, unique } from 'drizzle-orm/pg-core';

// 1. Users Table
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  username: text('username').notNull(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull()
});

// 2. Groups Table
export const groups = pgTable('groups', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull()
});

// 3. Group Memberships (with Unique constraint on groupId + userId)
export const groupMemberships = pgTable('group_memberships', {
  id: serial('id').primaryKey(),
  groupId: integer('group_id').references(() => groups.id).notNull(),
  userId: integer('user_id').references(() => users.id).notNull(),
  joinedAt: timestamp('joined_at').notNull(),
  leftAt: timestamp('left_at')
}, (table) => ({
  groupUserUnq: unique('group_user_unq').on(table.groupId, table.userId)
}));

// 4. Expenses Table
export const expenses = pgTable('expenses', {
  id: serial('id').primaryKey(),
  groupId: integer('group_id').references(() => groups.id).notNull(),
  paidById: integer('paid_by_id').references(() => users.id).notNull(),
  description: text('description').notNull(),
  amount: decimal('amount', { precision: 10, scale: 2 }).notNull(),
  currency: text('currency').default('INR').notNull(),
  exchangeRate: decimal('exchange_rate', { precision: 10, scale: 4 }).default('1.0000').notNull(),
  amountInINR: decimal('amount_in_inr', { precision: 10, scale: 2 }).notNull(),
  expenseDate: timestamp('expense_date').notNull(),
  splitType: text('split_type').notNull() // "equal", "percentage", "share", "unequal"
});

// 5. Expense Splits
export const expenseSplits = pgTable('expense_splits', {
  id: serial('id').primaryKey(),
  expenseId: integer('expense_id').references(() => expenses.id, { onDelete: 'cascade' }).notNull(),
  userId: integer('user_id').references(() => users.id).notNull(),
  shareAmount: decimal('share_amount', { precision: 10, scale: 2 }).notNull(),
  percentage: decimal('percentage', { precision: 5, scale: 2 })
});

// 6. Settlements Table
export const settlements = pgTable('settlements', {
  id: serial('id').primaryKey(),
  groupId: integer('group_id').references(() => groups.id).notNull(),
  payerId: integer('payer_id').references(() => users.id).notNull(),
  payeeId: integer('payee_id').references(() => users.id).notNull(),
  amount: decimal('amount', { precision: 10, scale: 2 }).notNull(),
  settlementDate: timestamp('settlement_date').notNull()
});

// 7. CSV Ingestion Sessions
export const csvImports = pgTable('csv_imports', {
  id: serial('id').primaryKey(),
  groupId: integer('group_id').references(() => groups.id).notNull(),
  filename: text('filename').notNull(),
  importedAt: timestamp('imported_at').defaultNow().notNull(),
  status: text('status').notNull() // "PENDING", "COMPLETED", "FAILED"
});

// 8. Staged Expenses
export const stagedExpenses = pgTable('staged_expenses', {
  id: serial('id').primaryKey(),
  importId: integer('import_id').references(() => csvImports.id).notNull(),
  rowNumber: integer('row_number').notNull(),
  date: timestamp('date').notNull(),
  description: text('description').notNull(),
  amount: decimal('amount', { precision: 10, scale: 2 }).notNull(),
  currency: text('currency').notNull(),
  paidBy: text('paid_by').notNull(),
  splitType: text('split_type').notNull(),
  splitWith: text('split_with').notNull(),
  splitDetails: text('split_details'),
  isFlagged: boolean('is_flagged').default(false).notNull()
});

// 9. CSV Anomalies
export const csvAnomalies = pgTable('csv_anomalies', {
  id: serial('id').primaryKey(),
  stagedExpenseId: integer('staged_expense_id').references(() => stagedExpenses.id).notNull(),
  anomalyType: text('anomaly_type').notNull(),
  severity: text('severity').notNull(), // "WARNING", "ERROR"
  description: text('description').notNull(),
  resolutionAction: text('resolution_action'),
  isResolved: boolean('is_resolved').default(false).notNull()
});
