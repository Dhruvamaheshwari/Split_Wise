# 💸 Splitwise MVP Clone

![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)
![NodeJS](https://img.shields.io/badge/Node.js-43853D?style=for-the-badge&logo=node.js&logoColor=white)
![ExpressJS](https://img.shields.io/badge/Express.js-404D59?style=for-the-badge)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-3982CE?style=for-the-badge&logo=Prisma&logoColor=white)

A comprehensive, full-stack web application designed to simplify bill splitting, expense tracking, and group finance management. Built with a modern tech stack, this application is fully responsive, optimized for real-time interactions, and features a premium dark-mode aesthetic.

---

## 📖 Overview

Managing shared expenses among friends, roommates, or travel buddies can be complicated. This MVP clone of Splitwise solves that problem by allowing users to create groups, add expenses, and automatically calculate who owes what. The application includes a smart settlement algorithm that minimizes the total number of transactions required to clear debts within a group.

---

## ✨ Key Features

### 🔐 1. Secure User Authentication
- Complete JWT-based authentication flow (Login/Signup).
- Secure password hashing using `bcrypt`.
- Cookie-based session management for enhanced security.

### 👥 2. Group Management
- **Create Groups:** Users can create custom groups for trips, apartments, or events.
- **Add Members:** Seamlessly add existing users to your group via username or email.
- **Role-Based Access:** Group creators have administrative privileges (e.g., removing members).

### 💰 3. Expense Tracking & Splitting
- **Add Expenses:** Log receipts, enter amounts, and write descriptions.
- **Dynamic Splits:** Choose between splitting equally or entering custom specific amounts for each member.
- **Receipt Breakdown:** Dedicated pages to view exactly how an expense was split.

### 🔄 4. Smart Debt Settlement (Settle Up)
- **Balance Calculation:** Automatically computes "You Owe" and "You Are Owed" amounts.
- **Minimized Transactions:** Uses an advanced greedy algorithm to simplify debts. For example, if A owes B ₹50 and B owes C ₹50, the app simplifies this to A owing C ₹50.

### 💬 5. Real-Time Communication
- **Live Group Chat:** Integrated real-time chat box in the Group Details page (implemented via 3-second polling for high reliability).
- **Expense Comments:** Users can comment on specific expenses to ask questions or confirm payments.

### 🌙 6. Premium UI / UX
- **Dark Mode:** Fully supported class-based dark mode using Tailwind CSS v4. User preference is saved via `ThemeContext` to `localStorage`.
- **Glassmorphism:** Modern UI with frosted glass panels, subtle gradients, and smooth hover animations.
- **Responsive Design:** Works flawlessly on Mobile, Tablet, and Desktop.

### 📄 7. Import & Export Functionality
- **CSV & Excel Import Engine:** Robust in-memory file parser (using `multer` and `xlsx`) that allows users to upload raw expense data. It features real-time anomaly detection, automatically sanitizing data (fixing commas, handling negative amounts, filling missing currencies) and generating a detailed "Processing Report" UI for the user.
- **CSV Export:** Instantly download a `.csv` file containing all transaction histories and current balances for offline record-keeping.

---

## 🛠️ Technology Stack & Architecture

**Frontend:**
- **React.js (Vite):** Fast compilation and component-based architecture.
- **Tailwind CSS v4:** Utility-first styling with built-in dark mode and custom CSS variables.
- **React Router DOM:** Client-side routing and protected routes.
- **Context API:** Global state management (Authentication and Theme).

**Backend:**
- **Node.js & Express.js:** RESTful API architecture.
- **Prisma ORM:** Type-safe database queries and schema management.
- **PostgreSQL (Neon DB):** Scalable, serverless relational database.
- **JSON Web Tokens (JWT):** Stateless authentication mechanism.

---

## 🚀 Installation & Local Setup

### Prerequisites
- Node.js (v18 or higher recommended)
- Git
- PostgreSQL Database URL (You can get a free one from Neon, Supabase, or Render)

### 1. Clone the Repository
```bash
git clone https://github.com/Dhruvamaheshwari/Split_Wise.git
cd Split_Wise
```

### 2. Backend Setup
Navigate to the backend directory and install dependencies:
```bash
cd backend
npm install
```

Create a `.env` file in the root of the `backend` directory and add the following:
```env
PORT=3000
DATABASE_URL="postgresql://username:password@host/database_name?sslmode=require"
JWT_SECRET="generate_a_random_very_secure_string_here"
FRONTEND_URL="http://localhost:5173"
NODE_ENV="development"
```

Initialize the database and run the server:
```bash
# Generate Prisma Client
npx prisma generate

# Push the schema to your database
npx prisma db push

# Start the development server
npm run dev
```
*The backend should now be running on http://localhost:3000*

### 3. Frontend Setup
Open a new terminal window, navigate to the frontend directory, and install dependencies:
```bash
cd frontend
npm install
```

Create a `.env` file in the root of the `frontend` directory:
```env
VITE_API_URL="http://localhost:3000"
```

Start the Vite development server:
```bash
npm run dev
```
*The frontend should now be running on http://localhost:5173*

---

## 📂 Folder Structure

```text
Split_Wise/
├── backend/
│   ├── controllers/      # Business logic for endpoints (auth, group, expense)
│   ├── middleware/       # JWT Auth verification middleware
│   ├── prisma/           # Prisma schema (schema.prisma)
│   ├── routes/           # Express router definitions
│   ├── server.js         # Entry point for backend
│   └── package.json
│
└── frontend/
    ├── public/           # Static assets
    ├── src/
    │   ├── components/   # Reusable UI components (Navbar, Button, Card, Spinner)
    │   ├── context/      # AuthContext, ThemeContext
    │   ├── pages/        # Route components (Dashboard, GroupDetails, ExpenseDetails)
    │   ├── App.jsx       # Main application wrapper and routing
    │   └── index.css     # Global styles & Tailwind v4 theme configuration
    ├── vercel.json       # Deployment configuration for Vercel SPA routing
    ├── vite.config.js    # Vite builder config
    └── package.json
```

---

## 🔌 Core API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/auth/signup` | Register a new user |
| `POST` | `/api/auth/login` | Login and receive JWT cookie |
| `GET`  | `/api/auth/session` | Get current logged-in user |
| `POST` | `/api/groups` | Create a new group |
| `GET`  | `/api/groups/:id/balances` | Get calculated settlement balances |
| `POST` | `/api/groups/:id/messages` | Post a live chat message |
| `POST` | `/api/expenses` | Add a new expense and splits |
| `POST` | `/api/settle` | Execute a settlement transaction |

---

## 🤖 AI Used (Assignment Requirement)

This application was developed with the extensive assistance of an **AI Coding Assistant (Google Gemini / Agentic AI)**. The integration of AI significantly accelerated the development process and ensured best practices were followed. 

**Key areas where AI was utilized:**

1. **Architecture & Scaffolding:** 
   - The AI assisted in laying out the initial Express/Prisma backend structure and setting up the React (Vite) boilerplate.
2. **Advanced Algorithms (Settle Up):** 
   - The AI was instrumental in writing the mathematical logic required to calculate group balances and implement the "Greedy Algorithm" to minimize debt transactions between users.
3. **UI/UX & Theming (Tailwind CSS v4):** 
   - The entire implementation of the **Premium Dark Mode**, CSS variables setup in `index.css`, and the `ThemeContext` was guided by AI. It also generated the responsive, glassmorphic UI components (`daisy-card`, `glass-panel`).
4. **Real-Time Communication:** 
   - The AI helped design a robust, polling-based architecture for the Live Group Chat, bypassing the need for complex WebSocket infrastructure while ensuring real-time syncing.
5. **Debugging & DevOps:** 
   - Resolving cross-origin (CORS) issues between frontend and backend.
   - Creating the `vercel.json` file to fix React Router 404 errors during Vercel deployment.

---

## 📜 License
This project is for educational and portfolio purposes. Feel free to fork and modify!
