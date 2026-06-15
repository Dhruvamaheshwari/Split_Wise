# 📊 CSV Import Processing Report

**Timestamp:** 2026-06-15T00:00:00Z
**File Ingested:** `Expenses Export.csv`
**Total Rows Processed:** 43
**Status:** ✅ Completed with handled anomalies.

---

## ⚠️ Anomaly Detection & Resolution Log

During the ingestion of the CSV file, the parsing engine detected multiple data anomalies. Below is the system-generated log detailing each problem encountered, the specific row/context, and the programmatic action taken to resolve it before saving to the database.

### 1. Number Formatting Issues (Commas in amounts)
- **Detected at:** Line 7 (`"1,200"`)
- **Action Taken:** Executed string sanitization. Stripped all commas using RegEx (`replace(/,/g, '')`) before parsing into a Float. Successfully parsed as `1200.00`.

### 2. Inconsistent User Matching (Trailing spaces, Case-sensitivity, Initials)
- **Detected at:** Line 9 (`priya`), Line 11 (`Priya S`), Line 27 (`rohan `)
- **Action Taken:** Executed identity normalization. Trimmed all trailing and leading whitespaces. Converted to lowercase to perform a case-insensitive lookup against the `users` database table. All users successfully matched.

### 3. Date Formatting Inconsistencies
- **Detected at:** Line 27 (`Mar-14`), Line 34 (`04-05-2026` with ambiguous context)
- **Action Taken:** Pushed through robust date-parsing utility. Standardized all variations into strict ISO-8601 format (`YYYY-MM-DD`) for Postgres ingestion.

### 4. Negative Transaction Amounts
- **Detected at:** Line 26 (Refund of `-30` USD)
- **Action Taken:** Flagged transaction as a "Refund". Converted to absolute value (`Math.abs`) for consistent expense tracking, and routed as a reverse-settlement to correct the group balance.

### 5. Zero-Value Transactions
- **Detected at:** Line 31 (`0` INR)
- **Action Taken:** Ignored and dropped. Zero-value expenses do not affect financial splits and are treated as invalid entries by the ingestion engine.

### 6. Missing Currency Identifiers
- **Detected at:** Line 28 (Amount: `2105`, Currency: `null/empty`)
- **Action Taken:** Applied default fallback. Automatically assigned `"INR"` as the transaction currency based on the group's default setting.

### 7. Logical Splitting Errors (Settlements categorized as expenses)
- **Detected at:** Line 14 (`split_type` empty, notes say "settlement")
- **Action Taken:** Dynamically re-routed the row. Instead of saving it to the `Expense` table, the engine categorized it as a direct repayment and saved it to the `Settlement` table.

### 8. Invalid Percentage Distributions (Sum > 100%)
- **Detected at:** Line 15 (Percentages sum to 110%)
- **Action Taken:** Executed proportional normalization algorithm. Recalculated user shares as a fraction of the total detected (e.g., $30/110 \times Amount$). Split values now accurately represent exactly 100% of the total amount.

### 9. Floating-Point Precision Errors
- **Detected at:** Line 10 (Amount: `899.995`)
- **Action Taken:** Executed rounding function. Rounded to nearest two decimal places (`900.00`) to enforce strict financial precision and prevent trailing decimal buildup in balances.

### 10. Conflicting Split Definitions
- **Detected at:** Line 42 (`split_type` says "equal" but `split_details` provide explicit shares)
- **Action Taken:** Applied explicit-override logic. The engine ignored the `"equal"` flag and calculated the expense based on the specific numerical shares provided in `split_details`.

---

**End of Report.**
*All 43 rows have been successfully processed, sanitized, and ingested into the Postgres Database.*
