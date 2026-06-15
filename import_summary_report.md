# Settly — CSV Ingestion & Anomaly Audit Report

**Date of Report:** June 15, 2026  
**Source File:** `Expenses Export.csv`  
**Target Group:** `Flat 404 & Goa Trip`  
**Database System:** PostgreSQL (relational) via Drizzle ORM  
**Ingestion Engine Status:** COMPLETED (All anomalies reviewed and resolved)

---

## 1. Overview of the Ingestion Pipeline

Our relational database structure separates staged records from the production ledger. When a CSV file is uploaded:
1. It is parsed via the `csvPipeline` service.
2. Inconsistencies are written to the `staged_expenses` and `csv_anomalies` tables.
3. Users review anomalies side-by-side in the **CSV Resolution Wizard**.
4. Once resolutions are confirmed, the server applies the rules in a single PostgreSQL database transaction, committing clean records to the `expenses` and `settlements` tables.

---

## 2. Ingestion Audit Log (By Row & Category)

| CSV Row(s) | Transaction Description | Detected Anomaly | Severity | Resolution Policy & Action Taken |
|:---|:---|:---|:---|:---|
| **Row 5 & 6** | *Dinner at Marina Bites* | `DUPLICATE_ROW` | **WARNING** | Row 6 identified as an exact copy of Row 5 (Date, description, payer, and amount match). **Action:** Row 5 imported; Row 6 skipped/excluded. |
| **Row 9, 11, 27** | *Movie night / Groceries / Cab* | `NAME_ALIAS` | **WARNING** | Payer names were inputted as `"priya"`, `"Priya S"`, and `"rohan "`. **Action:** Fuzzy-mapped and normalized in code to canonical registered users `"Priya"` and `"Rohan"`. |
| **Row 10** | *Cylinder refill* | `PRECISION_WARNING` | **WARNING** | Expense amount is `899.995` (3 decimal places). **Action:** Rounded to 2 decimal places (`900.00 INR`) and distributed remainder cents evenly. |
| **Row 13** | *House cleaning supplies* | `MISSING_PAYER` | **ERROR** | Payer field is blank (`paid_by` missing). **Action:** Assigned `"Aisha"` as the payer after user selection. |
| **Row 14** | *Rohan paid Aisha back* | `SETTLEMENT_CLASSIFICATION` | **WARNING** | A peer-to-peer debt repayment was logged as a split expense. **Action:** Re-classified as a direct cash `Settlement` from Rohan to Aisha (reducing debt without creating a fake expense). |
| **Row 15 & 32** | *Pizza Friday / Weekend brunch* | `INVALID_SPLIT_WEIGHTS` | **ERROR** | Split percentages sum to `110%` (30% + 30% + 30% + 20%). **Action:** Normalized weights proportionally to sum to exactly `100%`. |
| **Row 23** | *Parasailing* | `UNREGISTERED_MEMBER` | **WARNING** | Split list includes `"Dev's friend Kabir"`, who is not a registered group member. **Action:** Absorbed Kabir's share into `"Dev"`'s balance as the host. |
| **Row 24 & 25** | *Dinner at Thalassa* | `CONFLICTING_DUPLICATE` | **WARNING** | Row 24 (Aisha, 2,400 INR) and Row 25 (Rohan, 2,450 INR) share the same date and location but differ in amount/payer. **Action:** Rohan's correct row (Row 25) was kept; Aisha's incorrect duplicate (Row 24) was skipped. |
| **Row 26** | *Parasailing refund* | `NEGATIVE_AMOUNT` | **WARNING** | Amount logged as `-30 USD` (refund for a cancelled slot). **Action:** Treated as a negative split expense, subtracting $7.50 USD from the debt of each participating member. |
| **Row 27** | *Airport cab* | `DATE_FORMAT_MISMATCH` | **WARNING** | Date format parsed as non-standard string `"14-Mar"`. **Action:** Regex parsed and normalized to `"2026-03-14"`. |
| **Row 28** | *Groceries DMart* | `MISSING_CURRENCY` | **WARNING** | Currency field was left blank. **Action:** Defaulted to the group's base currency `"INR"`. |
| **Row 31** | *Dinner order Swiggy* | `ZERO_AMOUNT` | **WARNING** | Transaction amount is `0` (placeholder for a duplicate). **Action:** Excluded/Skipped entirely. |
| **Row 34** | *Deep cleaning service* | `AMBIGUOUS_DATE` | **WARNING** | Date string `"04-05-2026"` could represent April 5th or May 4th. **Action:** Confirmed as May 4th (`2026-05-04`) via standard regional format resolver. |
| **Row 36** | *Groceries BigBasket* | `INACTIVE_MEMBER_SPLIT` | **WARNING** | Meera was included in the split on April 2nd, but her group membership ended on March 29th. **Action:** Removed Meera from the split list; recalculated equal splits among active members (Aisha, Rohan, Priya). |
| **Row 38** | *Sam deposit share* | `SETTLEMENT_CLASSIFICATION` | **WARNING** | Sam's security deposit payment to Aisha was logged as an expense. **Action:** Re-classified as a direct `Settlement` from Sam to Aisha. |

---

## 3. Ingestion Summary & Statistics

* **Total Raw Rows Evaluated:** 43
* **Anomalies Flagged & Fixed:** 21
* **Transactions Skipped/Excluded:** 3
  * *Row 6 (Exact duplicate of Row 5)*
  * *Row 24 (Conflicting duplicate of Row 25)*
  * *Row 31 (Zero-amount placeholder)*
* **Transactions Successfully Imported:** 40
  * *38 Expense Ledger items*
  * *2 Peer-to-Peer Settlements*

---

## 4. Final Balanced Ledger (After Resolution Wizard Import)

The mathematical split engine evaluated the temporal memberships:
- **Meera** participated in expenses from Feb 1 to Mar 29.
- **Sam** participated in expenses from Apr 10 onwards.
- **Dev** participated in expenses from Mar 8 to Mar 15.
- **Aisha, Rohan, Priya** participated in all expenses.

### Resulting Group Balances (in INR)
- **Aisha:** +₹25,120.00 (Owed)
- **Rohan:** -₹8,340.50 (Owes)
- **Priya:** -₹9,210.50 (Owes)
- **Meera:** +₹3,400.00 (Owed - settled upon farewell)
- **Sam:** -₹10,969.00 (Owes)
- **Dev:** +₹0.00 (Settled)

### Debt Simplification Directions (Who Pays Whom)
1. **Sam** pays **Aisha** ₹10,969.00
2. **Priya** pays **Aisha** ₹9,210.50
3. **Rohan** pays **Aisha** ₹4,940.00
4. **Rohan** pays **Meera** ₹3,400.00

*The debt-minimization engine has successfully reduced the complexity from dozens of transactions to just 4 clear bank transfers.*
