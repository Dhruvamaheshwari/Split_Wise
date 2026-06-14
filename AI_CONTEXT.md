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
- **Real-time:** Supabase Real-time (for chat/expense updates).
- **ORM:** Prisma.
- **Hosting (Frontend & Backend):** Vercel.
- **Framework:** Frontend (React + Vite), Backend (Express.js).

## 5. Data Model & API Design
**Proposed Prisma Schema:**
- `User`: `id`, `email`, `username`, `created_at`
- `Group`: `id`, `name`, `created_at`
- `GroupMember`: `user_id`, `group_id`, `role` (e.g., creator, member), `joined_at`
- `Expense`: `id`, `group_id`, `paid_by_user_id`, `amount`, `description`, `created_at` (Note: Editing/Deleting disabled for MVP)
- `ExpenseSplit`: `expense_id`, `user_id`, `amount_owed` (Calculated on creation to simplify balance math)
- `Settlement`: `id`, `group_id`, `paid_by_user_id`, `paid_to_user_id`, `amount`, `created_at`
- `ExpenseComment`: `id`, `expense_id`, `user_id`, `content`, `created_at` (for Real-time Chat)

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
- **Real-time implementation:** Relying on Supabase Real-time for expense chat avoids the need for a separate WebSocket server.
- **Simplified Balances vs Exact Balances:** We are doing exact balances (who owes who) dynamically calculated on read or updated on write, prioritizing simplicity.
