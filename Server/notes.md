# Settly — Database Schema Reference

> **ORM:** Drizzle ORM  
> **Database:** PostgreSQL (hosted on Supabase, transaction-mode pooler)  
> **Connection:** `DATABASE_URL` in `Server/.env`

---

## Table Overview

| # | Table Name | Purpose |
|---|-----------|---------|
| 1 | `users` | Registered user accounts |
| 2 | `groups` | Shared expense groups (e.g. "Flat 4B Roommates") |
| 3 | `group_memberships` | Tracks who is in which group and when they joined/left |
| 4 | `expenses` | Individual shared expense records |
| 5 | `expense_splits` | Per-person debt allocation for each expense |
| 6 | `settlements` | Direct cash repayments between group members |
| 7 | `csv_imports` | Import session tracking for CSV uploads |
| 8 | `staged_expenses` | Temporary holding area for CSV rows before approval |
| 9 | `csv_anomalies` | Anomalies/issues detected per staged row during import |

---

## 1. `users`

**Purpose:** Stores every registered user account on Settly.

| Column | Type | Description |
|--------|------|-------------|
| `id` | serial (PK) | Auto-incremented unique user ID |
| `username` | text | Display name of the user (e.g. "Aisha") |
| `email` | text (unique) | Login email address |
| `password_hash` | text | bcrypt-hashed password (never stored in plaintext) |
| `created_at` | timestamp | When the account was registered |

**Used in:** All other tables that reference a user (via `user_id` / `paid_by_id` / `payer_id` / `payee_id`).

---

## 2. `groups`

**Purpose:** Represents a shared expense group — typically a flat, trip, or household where members split costs together.

| Column | Type | Description |
|--------|------|-------------|
| `id` | serial (PK) | Auto-incremented unique group ID |
| `name` | text | Human-readable group name (e.g. "Flat 4B – Mumbai") |
| `created_at` | timestamp | When the group was created |

**Used in:** `group_memberships`, `expenses`, `settlements`, `csv_imports`

---

## 3. `group_memberships`

**Purpose:** The join table between `users` and `groups`. Tracks the **temporal membership** of each user — including when they joined and when (if ever) they left. This is critical for determining who should be included in a split for any given expense date.

| Column | Type | Description |
|--------|------|-------------|
| `id` | serial (PK) | Auto-incremented membership record ID |
| `group_id` | integer (FK → groups) | Which group this membership belongs to |
| `user_id` | integer (FK → users) | Which user is the member |
| `joined_at` | timestamp | Date the user joined the group |
| `left_at` | timestamp (nullable) | Date the user left; `NULL` means still active |

**Constraints:** `UNIQUE(group_id, user_id)` — a user can only have one membership record per group.

**Business Logic:** When calculating splits, the system checks if `expense_date` falls between `joined_at` and `left_at` to determine if a user was an active member at the time of the expense.

---

## 4. `expenses`

**Purpose:** The main ledger table. Every shared expense paid by one person on behalf of the group is stored here.

| Column | Type | Description |
|--------|------|-------------|
| `id` | serial (PK) | Auto-incremented expense ID |
| `group_id` | integer (FK → groups) | Which group this expense belongs to |
| `paid_by_id` | integer (FK → users) | The user who paid the bill upfront |
| `description` | text | What the expense was for (e.g. "February rent") |
| `amount` | decimal(10,2) | Original amount in the native currency |
| `currency` | text | Currency code — `"INR"` or `"USD"` |
| `exchange_rate` | decimal(10,4) | Rate used for conversion (e.g. `83.0` for USD→INR) |
| `amount_in_inr` | decimal(10,2) | Final amount in INR after conversion |
| `expense_date` | timestamp | The date the expense occurred |
| `split_type` | text | How the expense was split: `"equal"`, `"percentage"`, `"share"`, or `"unequal"` |

**Used with:** `expense_splits` (one expense → many splits)

---

## 5. `expense_splits`

**Purpose:** Stores the individual debt allocation for each participant in an expense. One row per person per expense.

| Column | Type | Description |
|--------|------|-------------|
| `id` | serial (PK) | Auto-incremented split record ID |
| `expense_id` | integer (FK → expenses, CASCADE DELETE) | Parent expense this split belongs to |
| `user_id` | integer (FK → users) | The person who owes this share |
| `share_amount` | decimal(10,2) | How much (in INR) this person owes for this expense |
| `percentage` | decimal(5,2) (nullable) | Percentage weight, only populated when `split_type = "percentage"` |

**Notes:**
- When an expense is deleted, all its splits are automatically deleted (`CASCADE DELETE`).
- The payer is also included as a split participant — their `share_amount` represents what they are owed by others (net balance is calculated from this).

---

## 6. `settlements`

**Purpose:** Records a direct cash repayment between two group members (e.g. "Rohan paid Aisha ₹5,000 to settle his debt"). Settlements reduce the outstanding balance between two people without creating a new expense.

| Column | Type | Description |
|--------|------|-------------|
| `id` | serial (PK) | Auto-incremented settlement ID |
| `group_id` | integer (FK → groups) | Which group this settlement applies to |
| `payer_id` | integer (FK → users) | The person making the repayment |
| `payee_id` | integer (FK → users) | The person receiving the repayment |
| `amount` | decimal(10,2) | Amount paid (always in INR) |
| `settlement_date` | timestamp | When the settlement was made |

---

## 7. `csv_imports`

**Purpose:** Tracks each CSV file upload as a session. Stores the status of the import workflow so the system knows if a file has been reviewed and finalized or is still pending user action.

| Column | Type | Description |
|--------|------|-------------|
| `id` | serial (PK) | Auto-incremented import session ID |
| `group_id` | integer (FK → groups) | Which group the CSV is being imported for |
| `filename` | text | Original name of the uploaded CSV file |
| `imported_at` | timestamp | When the file was uploaded |
| `status` | text | Workflow state: `"PENDING"`, `"COMPLETED"`, or `"FAILED"` |

**Workflow:**
1. User uploads CSV → a `PENDING` session is created.
2. User reviews and resolves anomalies in the wizard.
3. User clicks "Complete Import" → status updates to `"COMPLETED"` and rows are written to `expenses`.

---

## 8. `staged_expenses`

**Purpose:** A temporary holding table for CSV rows that have been parsed but not yet committed to the main `expenses` table. Each row represents one line from the uploaded CSV file. Data stays here until the user finalises the import.

| Column | Type | Description |
|--------|------|-------------|
| `id` | serial (PK) | Auto-incremented staged row ID |
| `import_id` | integer (FK → csv_imports) | Which import session this row belongs to |
| `row_number` | integer | The original row number in the CSV file (for user reference) |
| `date` | timestamp | Parsed expense date from the CSV |
| `description` | text | Expense description from the CSV |
| `amount` | decimal(10,2) | Parsed amount from the CSV |
| `currency` | text | Currency code (defaulted to `"INR"` if missing) |
| `paid_by` | text | Payer name as a string (resolved to a user ID at finalize time) |
| `split_type` | text | Split method: `"equal"`, `"percentage"`, `"share"`, `"unequal"` |
| `split_with` | text | Semicolon-separated list of participant names (e.g. `"Aisha;Rohan;Priya"`) |
| `split_details` | text (nullable) | Semicolon-separated detail weights (e.g. `"Aisha 30%;Rohan 30%;Priya 40%"`) |
| `is_flagged` | boolean | `true` if this row has one or more anomalies detected |

**Note:** After a successful import finalize, these rows are NOT deleted — they remain as an audit record of the import.

---

## 9. `csv_anomalies`

**Purpose:** Stores the specific data quality issues (anomalies) detected for each staged expense row during the CSV parsing phase. The user must resolve every anomaly before the import can be finalised.

| Column | Type | Description |
|--------|------|-------------|
| `id` | serial (PK) | Auto-incremented anomaly ID |
| `staged_expense_id` | integer (FK → staged_expenses) | Which staged row this anomaly belongs to |
| `anomaly_type` | text | Category of the issue (see types below) |
| `severity` | text | `"WARNING"` (can proceed) or `"ERROR"` (must fix) |
| `description` | text | Human-readable explanation of the issue |
| `resolution_action` | text (nullable) | Text describing what the user chose to do to fix it |
| `is_resolved` | boolean | `true` once the user has taken a resolution action |

**Anomaly Types Detected:**

| Type | Severity | Description |
|------|----------|-------------|
| `MISSING_PAYER` | ERROR | The `paid_by` column is empty |
| `INVALID_PAYER` | ERROR | Payer name doesn't match any registered user |
| `UNREGISTERED_MEMBER` | WARNING | A split participant is not a registered user |
| `NAME_ALIAS` | WARNING | A name was auto-normalized (e.g. `"rohan "` → `"Rohan"`) |
| `DATE_FORMAT_MISMATCH` | WARNING | Non-standard date format was normalized |
| `AMBIGUOUS_DATE` | WARNING | Date like `04-05-2026` could be April 5 or May 4 |
| `MISSING_DATA` | ERROR | A required field (date, amount) is missing |
| `MISSING_CURRENCY` | WARNING | Currency was missing; defaulted to INR |
| `NEGATIVE_AMOUNT` | WARNING | Amount is negative (treated as a group refund) |
| `ZERO_AMOUNT` | WARNING | Amount is zero — likely a data entry error |
| `PRECISION_WARNING` | WARNING | Amount has more than 2 decimal places |
| `SETTLEMENT_CLASSIFICATION` | WARNING | Row description looks like a settlement, not an expense |
| `INACTIVE_MEMBER_SPLIT` | WARNING | A split participant was not an active member on the expense date |
| `DUPLICATE_ROW` | WARNING | Row appears to be an exact duplicate of a previous row |
| `CONFLICTING_DUPLICATE` | WARNING | Row shares date/description with another row but has different amounts/payer |
| `INVALID_SPLIT_WEIGHTS` | ERROR | Percentage split weights don't sum to 100% |

---

## Entity Relationship Summary

```
users ──────────────────────────────────────────────────────┐
  │                                                          │
  ├── group_memberships ──── groups ──── expenses ───────── expense_splits
  │       (joined_at,              │         │
  │        left_at)                │         └── settlements
  │                                │
  │                                └── csv_imports ──── staged_expenses ──── csv_anomalies
  │
  └── (referenced by expenses.paid_by_id,
       expense_splits.user_id,
       settlements.payer_id / payee_id)
```
