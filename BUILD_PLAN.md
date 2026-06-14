# Splitwise Clone MVP - Build Plan

This document serves as the comprehensive execution blueprint for building the Splitwise Clone MVP over a 3-day period. It is derived entirely from the agreed-upon `AI_CONTEXT.md`.

## 1. Product Research & Scope
**Primary Goal:** Build a simplified, group-based expense tracking web application mirroring core Splitwise features, constrained to a 2-day build and 1-day deployment timeline.

**Core Workflows:**
- **User Management:** Email/password authentication, searching users by username/email. No social login.
- **Group Management:** Direct add of existing users by group creator (no invite links). Members can only be removed if their balance is fully settled.
- **Expense Management:** Add expenses with split types (equal, unequal, percentage).
- **Real-time Chat:** Discussion thread tied to each specific expense.
- **Settlement:** Users can record a settlement (User A pays User B), dynamically reducing their net balance.
- **Balance Calculation:** "Simplified balances view" (direct exact debts). Balances are recalculated dynamically per group based on expenses and settlements.

**Out of Scope:**
- Recurring expenses, email invites, mobile app, friend requests, social login.
- Editing or deleting expenses/settlements once created (to ensure MVP stability within timeframe).

---

## 2. Technical Architecture & Tech Stack
- **Frontend & Backend Framework:** Next.js (App Router)
- **Database:** PostgreSQL (Relational)
- **Database Hosting & Auth & Real-time:** Supabase (Free Tier)
- **ORM:** Prisma
- **Deployment Platform:** Vercel

---

## 3. Database Schema (Prisma)
```prisma
model User {
  id         String   @id @default(uuid())
  email      String   @unique
  username   String   @unique
  created_at DateTime @default(now())
  // relations
}

model Group {
  id         String   @id @default(uuid())
  name       String
  created_at DateTime @default(now())
  // relations
}

model GroupMember {
  user_id   String
  group_id  String
  role      String   // 'creator' | 'member'
  joined_at DateTime @default(now())
  @@id([user_id, group_id])
}

model Expense {
  id              String   @id @default(uuid())
  group_id        String
  paid_by_user_id String
  amount          Float
  description     String
  created_at      DateTime @default(now())
}

model ExpenseSplit {
  expense_id  String
  user_id     String
  amount_owed Float
  @@id([expense_id, user_id])
}

model Settlement {
  id               String   @id @default(uuid())
  group_id         String
  paid_by_user_id  String
  paid_to_user_id  String
  amount           Float
  created_at       DateTime @default(now())
}

model Message {
  id         String   @id @default(uuid())
  expense_id String
  user_id    String
  content    String
  created_at DateTime @default(now())
}
```

---

## 4. API Design (Next.js Server Actions)
- `searchUsers(query)`: Finds users by email or username.
- `createGroup(name)`: Creates group, assigns creator role.
- `addGroupMember(groupId, userId)`: Adds a searched user.
- `removeGroupMember(groupId, userId)`: Validates user has zero balance, then removes.
- `createExpense(groupId, amount, description, splits)`: Inserts Expense and associated ExpenseSplits in a Prisma transaction.
- `getGroupBalances(groupId)`: Aggregates `ExpenseSplit` and `Settlement` tables to compute exact amounts owed between users.
- `createSettlement(groupId, paidToUserId, amount)`: Records a debt payment.

---

## 5. Frontend Structure & Routing
- **Navbar:** Common top navigation with Logout button.
- **`/login`**, **`/signup`**: Supabase Auth forms.
- **`/dashboard`**: List of the authenticated user's groups and their total global net balance.
- **`/group/[id]`**: Group view showing:
  - List of expenses
  - List of members
  - Group balance summary (who owes who)
- **`/group/[id]/expense/new`**: Form to create an expense and define splits.
- **`/expense/[id]`**: Expense detail view displaying:
  - The split breakdown
  - Real-time chat (Supabase Real-time channel for `Message` inserts).
- **`/settle`**: Form to record a settlement payment.

---

## 6. Deployment Plan
1. **Repository Setup:** Initialize Git repository and push code.
2. **Supabase Configuration:** 
   - Apply Prisma migrations to the Supabase Postgres instance.
   - Configure Supabase Auth providers (Email).
   - Enable Supabase Real-time on the `Message` table.
3. **Vercel Deployment:**
   - Import Git repository to Vercel.
   - Configure environment variables (`DATABASE_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`).
   - Trigger production build.

---

## 7. Testing Plan
- **Auth Flow:** Verify successful signup, login, and protected route redirection.
- **Group Management:** Verify creator can add users by search, and cannot remove users with an active balance.
- **Balance Math:** Create complex splits (e.g., unequal), and assert the `getGroupBalances` aggregation matches expectations.
- **Settlements:** Verify that creating a settlement correctly reduces the owed balance in the group view.
- **Real-time Chat:** Open `/expense/[id]` in two separate browser profiles to ensure messages appear instantly without refresh.

---

## 8. Trade-offs
- **Exact Balances over Simplified Debts:** We chose not to implement a debt-minimization algorithm to save time, relying instead on exact 1:1 transaction tracking.
- **No Edit/Delete for Expenses:** To avoid complex cascade recalculations of settled balances, expenses and settlements are immutable once created.
- **No Email Invites:** Replacing email invites with a direct username search bypasses the need to build a pending invitation state machine.

---

## 9. AI Collaboration Process
1. **Source of Truth:** `AI_CONTEXT.md` remains the absolute source of truth. Any requirement changes discovered during coding must be updated there first.
2. **Step-by-Step Execution:** We will build this incrementally (Setup -> DB -> Auth -> API -> UI). We will not write the entire application in a single prompt.
3. **Continuous Review:** The human engineer will review the PRs/commits at each phase before moving to the next.
