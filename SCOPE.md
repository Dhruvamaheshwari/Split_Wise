# 📋 SCOPE.md - Project Anomaly Log & Database Schema

This document details the data anomalies found in the provided `Expenses Export.csv` file, the strategies implemented to handle them, and the final Database Schema used for the Splitwise MVP.

---

## 🔍 Part 1: Anomaly Log (CSV Data Problems & Handling)

Upon analyzing the `Expenses Export.csv` file, several data inconsistencies, formatting errors, and logical anomalies were discovered. 

> **Live Implementation Note:** Instead of just documenting these anomalies, a fully functional **Data Ingestion Engine** was built into the application. Users can upload `.csv` or `.xlsx` files via the Dashboard. The backend (using `multer` and `xlsx`) processes the file in-memory and programmatically executes the handling strategies below in real-time, generating a detailed UI report of exactly what was fixed.

Below is the comprehensive log of these issues and how they were handled by the ingestion engine:

| # | Anomaly / Data Problem Found | Example from CSV | How It Was Handled |
|---|-----------------------------|------------------|---------------------|
| **1** | **Commas in Number Strings** | `Aisha, "1,200", INR` (Line 7) | Stripped out commas from the `amount` string using RegEx (`replace(/,/g, '')`) before parsing it into a Float. |
| **2** | **Inconsistent Name Formatting** | `priya`, `Priya S`, `rohan ` (Lines 9, 11, 27) | Trimmed all trailing/leading whitespaces and converted to lowercase for case-insensitive matching against the User table in the DB. |
| **3** | **Multiple Date Formats** | `01-02-2026` vs `Mar-14` (Line 27) | Implemented a robust Date parsing utility (`date-fns` or custom JS parser) to normalize all dates into standard ISO-8601 format (`YYYY-MM-DD`) before saving to the database. |
| **4** | **Negative Amounts** | `-30` (Parasailing refund, Line 26) | Stored as a positive expense but flagged the transaction type as a "Refund" or processed it as an inverse settlement (crediting the payer). |
| **5** | **Zero Amounts** | `0` (Dinner order Swiggy, Line 31) | Filtered out and ignored entirely during the import pipeline, as an expense of ₹0 does not impact group balances. |
| **6** | **Missing Currency** | `2105,,equal` (Line 28) | Added a fallback mechanism that defaults to `"INR"` if the currency field is null, empty, or undefined. |
| **7** | **Settlements mixed with Expenses** | `5000,INR,,Aisha` (Line 14) | Identified rows where `split_type` was missing or empty as **Settlements** rather than Expenses, routing them to the `Settlement` table. |
| **8** | **Invalid Percentages (Sum > 100%)** | `Aisha 30%; Rohan 30%; Priya 30%; Meera 20%` (Line 15) | Detected that the sum equals 110%. The system normalizes the values proportionally (e.g., $30/110 \times Total$) to ensure mathematically accurate splits. |
| **9** | **Excessive Decimal Places** | `899.995` (Line 10) | Rounded to the nearest 2 decimal places (`Math.round(val * 100) / 100`) to prevent floating-point precision errors in financial calculations. |
| **10**| **Conflicting Split Types & Details** | `equal` but provides `Aisha 1; Rohan 1` (Line 42)| If `split_details` specifies shares, it overrides the `split_type` flag (which was incorrectly marked as "equal"). |

---

## 🗄️ Part 2: Database Schema (Prisma)

Below is the complete relational database schema designed for this application, written in Prisma. It handles Users, Groups, Expenses, Custom Splits, and Settlements.

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// -------------------------------------
// Core Application Models
// -------------------------------------

model User {
  id                 String           @id @default(cuid())
  username           String?          @unique
  email              String?          @unique
  password           String?          
  created_at         DateTime         @default(now())

  // App Relations
  group_members      GroupMember[]
  expenses_paid      Expense[]        @relation("ExpensePaidBy")
  splits             ExpenseSplit[]
  settlements_paid   Settlement[]     @relation("SettlementPaidBy")
  settlements_received Settlement[]   @relation("SettlementPaidTo")
  comments           ExpenseComment[]
  group_messages     GroupMessage[]

  @@map("users")
}

model Group {
  id         String        @id @default(uuid())
  name       String
  created_at DateTime      @default(now())

  // Relations
  members    GroupMember[]
  expenses   Expense[]
  settlements Settlement[]
  messages   GroupMessage[]

  @@map("groups")
}

model GroupMember {
  user_id   String
  group_id  String
  role      String   // 'creator' | 'member'
  joined_at DateTime @default(now())

  user      User     @relation(fields: [user_id], references: [id], onDelete: Cascade)
  group     Group    @relation(fields: [group_id], references: [id], onDelete: Cascade)

  @@id([user_id, group_id])
  @@map("group_members")
}

model Expense {
  id              String           @id @default(uuid())
  group_id        String
  paid_by_user_id String
  currency        String           @default("INR")
  original_amount Float?
  exchange_rate   Float            @default(1.0)
  split_type      String           @default("EQUAL") // EQUAL, EXACT, PERCENTAGE, SHARE
  amount          Float
  description     String
  created_at      DateTime         @default(now())

  group           Group            @relation(fields: [group_id], references: [id], onDelete: Cascade)
  paid_by         User             @relation("ExpensePaidBy", fields: [paid_by_user_id], references: [id])
  splits          ExpenseSplit[]
  comments        ExpenseComment[]

  @@map("expenses")
}

model ExpenseSplit {
  expense_id  String
  user_id     String
  split_value Float?   // The raw percentage or share value entered
  amount_owed Float    // The final calculated fiat amount

  expense     Expense @relation(fields: [expense_id], references: [id], onDelete: Cascade)
  user        User    @relation(fields: [user_id], references: [id], onDelete: Cascade)

  @@id([expense_id, user_id])
  @@map("expense_splits")
}

model ExpenseComment {
  id         String   @id @default(uuid())
  expense_id String
  user_id    String
  content    String
  created_at DateTime @default(now())

  expense    Expense @relation(fields: [expense_id], references: [id], onDelete: Cascade)
  user       User    @relation(fields: [user_id], references: [id], onDelete: Cascade)

  @@map("expense_comments")
}

model Settlement {
  id               String   @id @default(uuid())
  group_id         String
  paid_by_user_id  String
  paid_to_user_id  String
  amount           Float
  created_at       DateTime @default(now())

  group            Group    @relation(fields: [group_id], references: [id], onDelete: Cascade)
  paid_by          User     @relation("SettlementPaidBy", fields: [paid_by_user_id], references: [id])
  paid_to          User     @relation("SettlementPaidTo", fields: [paid_to_user_id], references: [id])

  @@map("settlements")
}

model GroupMessage {
  id         String   @id @default(uuid())
  group_id   String
  user_id    String
  content    String
  created_at DateTime @default(now())

  group      Group    @relation(fields: [group_id], references: [id], onDelete: Cascade)
  user       User     @relation(fields: [user_id], references: [id], onDelete: Cascade)

  @@map("group_messages")
}
```
