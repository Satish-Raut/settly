# Anomaly Log & Database Schema (`SCOPE.md`)

This file details (1) every data problem (anomaly) identified in the raw `Expenses Export.csv` and our system's resolution policy, and (2) our database table schemas.

---

## 1. CSV Anomaly Audit Log

Our ingestion engine identified **12 distinct categories of deliberate anomalies** in `Expenses Export.csv`. Here is the log of how our system handles each one:

| CSV Row(s) | Description of Problem | Detected Anomaly | System Handling & Resolution Policy |
|---|---|---|---|
| **Row 5 & 6** | *Marina Bites Dinner*: Dev logged 3,200 INR twice. | **Duplicate Row Warning** | Flags Row 6 as a potential duplicate. The staging wizard shows both to the user side-by-side, allowing them to delete the duplicate or import both. |
| **Row 24 & 25** | *Thalassa Dinner*: Aisha logged 2,400 INR; Rohan logged 2,450 INR. | **Conflicting Duplicate Warning** | Flags rows as conflict because date, split list, and location match, but amounts and payers differ. User must review and select the "winning" transaction. |
| **Row 26** | *Parasailing Refund*: Negative amount (-30 USD). | **Negative Amount (Refund)** | Identified as a group refund. Instead of charging members, it subtracts $7.50 USD from what each member owes Dev. |
| **Row 27** | *Airport Cab*: Date format is `"Mar-14"`. | **Date Format Mismatch** | Normalizes non-standard date strings (e.g. `"Mar-14"` $\to$ `"2026-03-14"`) using helper regex parsers. |
| **Row 34** | *Deep cleaning*: Date format `"04-05-2026"` is ambiguous (April 5th vs May 4th). | **Ambiguous Date Warning** | Triggers a validation flag. Prompts user to confirm the date mapping (DD/MM vs MM/DD) during the staging phase. |
| **Row 28** | *Groceries DMart*: Currency column is missing/blank. | **Missing Currency Warning** | Detects empty currency. Resolves by applying the default group currency (`INR`) and alerts the user in the report. |
| **Row 13** | *House cleaning*: Paid_by field is missing/blank. | **Missing Payer Error** | High-severity error. Staging halts the row from importing until the user assigns a valid payer (e.g. Aisha, Rohan) in the UI. |
| **Row 9, 11, 27**| *User spelling variation*: `"priya"`, `"Priya S"`, `"rohan "`. | **User Name Alias Warning** | Normalizes strings (trimming whitespace, capitalization). Uses fuzzy mapping to resolve aliases to registered user accounts (`Priya`, `Rohan`). |
| **Row 14 & 38** | *Rohan paid Aisha*: A settlement logged as a split expense. | **Settlement Classification** | Detects description keywords ("paid back", "deposit"). Automatically re-classifies the row as a `Settlement` transaction instead of a split expense. |
| **Row 10** | *Cylinder refill*: Amount is `899.995` (3 decimals). | **Precision / Math Division warning** | Rounds the amount to 2 decimal places (`900.00` or `900`). Distributes remainder cents to prevent rounding leakage. |
| **Row 15 & 32** | *Pizza Friday*: Percentages sum to 110% (30 + 30 + 30 + 20). | **Invalid Splitting Weights Error** | Detects invalid sum. Halts import and prompts user to adjust splits or normalize them to sum to 100%. |
| **Row 36** | *Groceries*: Meera is included in April 2nd expense splits, but she left on March 29th. | **Inactive Member split warning** | Identifies that Meera’s membership was inactive on the expense date. Offers to remove Meera and redistribute her split share to active members. |
| **Row 23** | *Parasailing*: Includes `"Dev's friend Kabir"` who is not in the group. | **Unregistered Member split** | Identifies Kabir as an unknown user. Offers to create a guest account for Kabir or absorb his cost into Dev's share. |
| **Row 31** | *Swiggy*: Expense amount is `0`. | **Zero Amount Warning** | Flags row as zero-value. Offers to ignore the line or delete it. |

---

## 2. Database Schema (Prisma Definitions)

Our relational PostgreSQL database runs the following models:

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

model User {
  id           Int               @id @default(autoincrement())
  username     String
  email        String            @unique
  passwordHash String
  createdAt    DateTime          @default(now())
  memberships  GroupMembership[]
  paidExpenses Expense[]         @relation("PayerRelation")
  splits       ExpenseSplit[]
  sentPayments Settlement[]      @relation("PayerSettlement")
  rcvdPayments Settlement[]      @relation("PayeeSettlement")
}

model Group {
  id          Int               @id @default(autoincrement())
  name        String
  createdAt   DateTime          @default(now())
  memberships GroupMembership[]
  expenses    Expense[]
  settlements Settlement[]
  imports     CSVImport[]
}

model GroupMembership {
  id        Int       @id @default(autoincrement())
  groupId   Int
  userId    Int
  joinedAt  DateTime
  leftAt    DateTime?
  group     Group     @relation(fields: [groupId], references: [id])
  user      User      @relation(fields: [userId], references: [id])

  @@unique([groupId, userId])
}

model Expense {
  id           Int            @id @default(autoincrement())
  groupId      Int
  paidById     Int
  description  String
  amount       Decimal        @db.Decimal(10, 2)
  currency     String         @default("INR")
  exchangeRate Decimal        @default(1.0)  @db.Decimal(10, 4)
  amountInINR  Decimal        @db.Decimal(10, 2)
  expenseDate  DateTime
  splitType    String         // "equal", "percentage", "share", "unequal"
  group        Group          @relation(fields: [groupId], references: [id])
  payer        User           @relation("PayerRelation", fields: [paidById], references: [id])
  splits       ExpenseSplit[]
}

model ExpenseSplit {
  id          Int      @id @default(autoincrement())
  expenseId   Int
  userId      Int
  shareAmount Decimal  @db.Decimal(10, 2)
  percentage  Decimal? @db.Decimal(5, 2)
  expense     Expense  @relation(fields: [expenseId], references: [id], onDelete: Cascade)
  user        User     @relation(fields: [userId], references: [id])
}

model Settlement {
  id             Int      @id @default(autoincrement())
  groupId        Int
  payerId        Int
  payeeId        Int
  amount         Decimal  @db.Decimal(10, 2)
  settlementDate DateTime
  group          Group    @relation(fields: [groupId], references: [id])
  payer          User     @relation("PayerSettlement", fields: [payerId], references: [id])
  payee          User     @relation("PayeeSettlement", fields: [payeeId], references: [id])
}

model CSVImport {
  id         Int             @id @default(autoincrement())
  groupId    Int
  filename   String
  importedAt DateTime        @default(now())
  status     String          // "PENDING", "COMPLETED", "FAILED"
  group      Group           @relation(fields: [groupId], references: [id])
  stagedRows StagedExpense[]
}

model StagedExpense {
  id           Int          @id @default(autoincrement())
  importId     Int
  rowNumber    Int
  date         DateTime
  description  String
  amount       Decimal      @db.Decimal(10, 2)
  currency     String
  paidBy       String
  splitType    String
  splitWith    String
  splitDetails String?
  isFlagged    Boolean      @default(false)
  import       CSVImport    @relation(fields: [importId], references: [id])
  anomalies    CSVAnomaly[]
}

model CSVAnomaly {
  id               Int           @id @default(autoincrement())
  stagedExpenseId  Int
  anomalyType      String
  severity         String        // "WARNING", "ERROR"
  description      String
  resolutionAction String?
  isResolved       Boolean       @default(false)
  stagedExpense    StagedExpense @relation(fields: [stagedExpenseId], references: [id])
}
```
