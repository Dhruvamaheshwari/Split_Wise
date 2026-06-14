# AI_CONTEXT

## 1. Product Goals & Research
**Primary Goal:** Build a simplified Splitwise clone for groups within a strict 2-day timeline for building and deployment.

## 2. Scope & Personas
**Must-have MVP Features:**
- User Login
- Create Groups & add/remove members (search/add by username)
- Create Expenses with various split types (Equal, Unequal, Percentage, Shares)
- Real-time chat per expense
- Group balance summary & Individual balance summary
- Settle debts

**Out of Scope:**
- Recurring expenses
- Email invites (replaced by username search)
- Mobile app (Web only)
- Friend requests

## 3. Core Workflows (Groups, Expenses, Settlements)
- **User Management:** Login, search for users by username.
- **Group Management:** Create group. Group creator can add members by searching existing users (by email/username). Direct add (no invite links). Group creator can remove members, but only if that member has no pending balance in the group.
- **Expense Management:** Add expenses, specify split type, discuss via real-time chat on the expense.
- **Settlement:** Settlements are recorded in a separate table (User A pays User B). Recording a settlement reduces the net balance. No explicit "approval" mentioned, assume automatic applied.
- **Balance Calculation Algorithm:** Maintain a "simplified balances view" where each user owes another user an amount. When an expense is created, recompute all balances for that group. Provide both group-wise and individual balance summaries.

## 4. Technical Architecture (Frontend, Backend, Database)
- **Database:** PostgreSQL (hosted on Supabase free tier).
- **Authentication:** Supabase Auth (Email + password only. Separate Signup and Login pages. No social login for MVP).
- **Real-time:** Pusher WebSockets (for chat/expense updates).
- **ORM:** Prisma.
- **Hosting (Frontend & Backend):** Vercel.
- **Framework:** Frontend (React + Vite), Backend (Express.js).

## 5. Data Model & API Design
**Proposed Prisma Schema (with Neon DB & Auth.js integration):**
- **Auth.js Core:** `Account` (`accounts`), `Session` (`sessions`), `VerificationToken` (`verification_tokens`)
- `User` (`users`): `id`, `name`, `email`, `emailVerified`, `image`, `password` (for credentials), `username`, `created_at`
- `Group` (`groups`): `id`, `name`, `created_at`
- `GroupMember` (`group_members`): `user_id`, `group_id`, `role`, `joined_at`
- `Expense` (`expenses`): `id`, `group_id`, `paid_by_user_id`, `amount`, `description`, `created_at`
- `ExpenseSplit` (`expense_splits`): `expense_id`, `user_id`, `amount_owed`
- `Settlement` (`settlements`): `id`, `group_id`, `paid_by_user_id`, `paid_to_user_id`, `amount`, `created_at`
- `ExpenseComment` (`expense_comments`): `id`, `expense_id`, `user_id`, `content`, `created_at`

## 6. UI Screens & Navigation
- **Navbar:** Common top navigation with Logout button.
- **`/login`**, **`/signup`**: Authentication pages.
- **`/dashboard`**: List of user's groups + user's total net balance.
- **`/group/[id]`**: Group details, expenses list, members list, and group balance summary.
- **`/group/[id]/expense/new`**: Form to create an expense.
- **`/expense/[id]`**: Expense details, split breakdown, and real-time chat.
- **`/settle`**: Form to record a settlement payment between two users.

## 7. Deployment & Testing
- **Deployment Platform:** Vercel for full-stack hosting.
- **Database Hosting:** Supabase Free Tier.

## 8. Risks & Tradeoffs
- **2-Day Timeline Constraints:** Disabling edit/delete for expenses and settlements ensures we can meet the deadline without debugging complex balance recalculation edge cases.
- **Real-time implementation:** Relying on Pusher for expense chat provides a standard, decoupled WebSocket integration replacing Supabase Realtime.
- **Simplified Balances vs Exact Balances:** We are doing exact balances (who owes who) dynamically calculated on read or updated on write, prioritizing simplicity.

## 9. Migration Plan (Neon DB, Auth.js, Pusher)
**Target Stack Updates:**
- **Database:** Neon DB (Serverless PostgreSQL)
- **Authentication:** Migrate from Supabase Auth to Auth.js for Express (`@auth/express`) using the Credentials Provider and `@auth/prisma-adapter`.
- **Real-time:** Migrate from Supabase Realtime to Pusher (Free Tier) for expense comment chat synchronization.

**Migration Strategy:**
1. **Database:** Update Prisma configuration to point directly to Neon DB (already in progress via `prisma.config.ts`).
2. **Authentication:** 
   - Migration to `@auth/express` is **COMPLETE**.
   - Supabase Auth has been removed. The app now uses cookie-based sessions with the Auth.js Credentials Provider backed by Prisma and `bcryptjs`.
3. **Real-time Chat:**
   - Install `pusher` (backend) and `pusher-js` (frontend).
   - In `expenseController.js` (addComment), dispatch a Pusher event `new-comment` to the channel `expense-[id]`.
   - In `ExpenseDetails.jsx`, replace the Supabase WebSocket subscription with a Pusher subscription.

## 10. Known Issues & Edge Cases
- **Pusher Connection Limits:** The free tier of Pusher is limited to 100 max concurrent connections. If usage exceeds this, real-time comments will fall back to requiring a page refresh.
- **Concurrent Settlement Conflicts:** If two users try to settle the same debt simultaneously, it may result in double-recording. We do not currently lock the balance engine.
- **Round-off Errors:** Floating point rounding on splits (e.g. 3-way equal splits of $10.00 = 3.33) leaves $0.01 unassigned. The backend allows a 0.05 epsilon variance.

## 11. CSV Data Testing & Advanced Edge Cases
**Purpose:** Ensure system stability by testing against a messy, real-world CSV export containing contradictions and missing data.
**Implemented Edge Case Capabilities:**
- **Currencies:** `Expense` model now includes `currency`, `original_amount`, and `exchange_rate` fields. USD expenses are converted to base currency (INR) using a fixed 85.0 exchange rate. Balances are computed in the base currency.
- **Negative Expenses:** Permitted by DB, treated as refunds. The balance algorithm dynamically handles reverse debts.
- **Settlements in CSV:** Empty `split_type` and targeted `split_with` values denote Settlements, mapped directly to the `Settlement` table rather than `Expense` table.
- **Split Mathematics:** `ExpenseSplit` now stores `split_value` (the raw percentage or share number). The API computes the exact fiat `amount_owed` dynamically to prevent frontend math tampering.
- **Contradictory Splits/Math:** Percentage splits totaling >100% are mathematically normalized to 100% via the seed script. Missing `paid_by` are defaulted to the group creator.
