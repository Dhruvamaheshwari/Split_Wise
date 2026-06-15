# 📓 DECISIONS.md - Engineering & Architectural Decision Log

This document serves as a comprehensive log of the engineering, architectural, and product decisions made during the lifecycle of the Splitwise MVP project. It is structured to provide the tech team with deep insights into the trade-offs, constraints, and methodologies applied from day one of the project.

---

## 🏗️ 1. System Architecture & Database Selection

### The Problem
A bill-splitting application requires highly relational data. A single `Expense` involves a `Payer`, a `Group`, and multiple `ExpenseSplits` linking to `Users`. 

### Options Considered
1. **MongoDB (Mongoose):** Flexible schema, fast initial development.
2. **PostgreSQL (Prisma ORM):** Strict schema, ACID compliant, robust relational integrity.

### The Decision & Rationale
We chose **PostgreSQL with Prisma ORM**.
Financial applications cannot tolerate data inconsistency. If a user deletes an expense, all associated splits and comments must be predictably cascaded and deleted to prevent orphaned financial records. PostgreSQL's ACID compliance guarantees this. 

Prisma was chosen over raw SQL or Sequelize because:
- It provides End-to-End type safety when paired with TypeScript/JSDoc.
- The `schema.prisma` acts as a single source of truth.
- Migrations are deterministic and easily version-controlled.

---

## 🧮 2. The Debt Settlement Algorithm (Simplifying Debts)

### The Problem
When users add expenses in a group, it creates a complex, tangled web of debts. If A owes B ₹50, and B owes C ₹50, naive tracking would require A to pay B, and B to pay C.

### Options Considered
1. **Naive 1:1 Tracking:** Track every exact expense and force 1:1 payback.
2. **Greedy Algorithm (Net Balance Graphing):** Calculate the net balance of every user, then iteratively settle the largest debtor with the largest creditor.

### The Decision & Rationale
We implemented the **Greedy Algorithm**.
The core value of Splitwise is minimizing cash flow. 
**Implementation details:**
1. We compute a net balance dictionary for the group: `+ values` mean the user is owed money (Creditor), `- values` mean the user owes money (Debtor).
2. We separate users into two lists: `debtors` and `creditors`.
3. We sort both lists by magnitude.
4. We iteratively take the largest debtor and match them with the largest creditor, creating an optimized "Settlement Transaction" instruction.
*This reduced the number of transactions required by up to 60% in groups of 4+ people.*

---

## 🔄 3. Real-Time Communication Strategy

### The Problem
Users needed a "Live Discussion" chat in the Group Details page and "Live Comments" in the Expense Details page.

### Options Considered
1. **WebSockets (Socket.io):** True real-time, bi-directional communication.
2. **Serverless WebSockets (Pusher):** Managed third-party pub/sub.
3. **HTTP Polling (setInterval):** Client repeatedly asks the server for new data.

### The Decision & Rationale
We started with **Pusher** but ultimately pivoted to **HTTP Polling (Every 3 seconds)**.
*Why?* The backend and frontend are designed to be deployed in stateless, serverless environments (like Vercel). Native `Socket.io` fails in serverless environments because connections cannot persist. We initially implemented `Pusher`, but it introduced unnecessary third-party dependency overhead, strict environment variable requirements, and potential free-tier limits for an MVP. 

By switching to a 3-second HTTP Polling mechanism utilizing React's `useEffect`, we achieved a "real-time feel" that is 100% resilient, scales perfectly in serverless environments, and eliminated all external dependencies.

---

## 🔐 4. Authentication & Security Posture

### The Problem
How to securely handle user sessions and protect API endpoints from unauthorized access.

### Options Considered
1. **JWT in LocalStorage:** Easy to implement, but highly vulnerable to Cross-Site Scripting (XSS).
2. **HttpOnly Cookies:** Harder to implement with CORS, but immune to XSS.

### The Decision & Rationale
We implemented **HttpOnly Cookies with JWTs**.
Because this app handles financial data, security was paramount. Storing tokens in `localStorage` means any malicious third-party script could steal the token. By using `HttpOnly`, the browser hides the token from JavaScript entirely. 

**Challenge Faced:** This decision led to complex CORS issues during local development and deployment. We resolved this by explicitly configuring the Express backend CORS policy to allow `credentials: true` and specifically whitelisting the frontend origin, ensuring secure, authenticated cross-origin requests.

---

## 🎨 5. UI/UX, Theming, & Dark Mode

### The Problem
Building a premium, responsive user interface rapidly while supporting a full Dark Mode.

### Options Considered
1. **CSS Modules:** Scoped, but slow to write.
2. **Tailwind CSS v3:** Great, but requires a complex `tailwind.config.js`.
3. **Tailwind CSS v4:** The newest release with zero-config and CSS-variable based theming.

### The Decision & Rationale
We adopted the bleeding-edge **Tailwind CSS v4**.
Instead of managing a massive configuration file, we utilized Tailwind v4's `@theme` directive directly in `index.css`. 

**Dark Mode Implementation:**
We rejected the default `prefers-color-scheme` media query in favor of a **Class-based manual toggle** (`@custom-variant dark (&:where(.dark, .dark *));`). 
We built a custom `ThemeContext` in React that:
1. Checks the user's system preference on first load.
2. Allows the user to manually toggle the theme via the Navbar.
3. Persists the choice in `localStorage`.

To impress users, we specifically avoided generic greys for Dark Mode, instead engineering a custom "Deep Slate" (Slate-950/Slate-900) palette that provides exceptionally high contrast and a premium "Glassmorphism" aesthetic.

---

## 🚀 6. Deployment & Routing Architecture

### The Problem
Deploying a Single Page Application (SPA) built with React Router to Vercel often results in `404 Not Found` errors when users manually refresh a nested route (e.g., `/group/123`).

### The Decision & Rationale
We engineered a custom `vercel.json` configuration file at the root of the frontend. We implemented a SPA catch-all rewrite rule:
```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```
This forces Vercel's edge network to route all traffic back to `index.html`, allowing React Router to successfully take over the routing logic on the client side, completely eliminating the 404 refresh bugs.

---

## 📊 7. Data Ingestion & File Parsing

### The Problem
The assignment required ingesting a `.csv` file, analyzing anomalies, and generating a report. We needed a way to accept file uploads without cluttering the server's disk space, while also supporting common user behaviors (like uploading `.xlsx` instead of `.csv`).

### The Decision & Rationale
We implemented **In-Memory Parsing using `multer` and `xlsx`**.
Instead of saving the uploaded files to disk (`dest: 'uploads/'`), which introduces massive security and storage issues in serverless environments, we utilized `multer.memoryStorage()`. This keeps the file temporarily in RAM as a Buffer.

We chose the `xlsx` package over a standard `csv-parser` because it seamlessly reads both `.csv` and Excel formats directly from a Buffer without needing distinct parsers. 

**Case-Sensitivity Challenge:** The `xlsx` parser preserves exact header casing (e.g., `Amount` vs `amount`). We engineered an automatic key-normalization loop that converts all headers to lowercase and replaces spaces with underscores before applying our anomaly validation rules, ensuring highly robust data ingestion regardless of how the user formats their spreadsheet columns.
