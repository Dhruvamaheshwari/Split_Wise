# 🤖 AI_USAGE.md - AI Collaboration & Oversight Log

This document details how I utilized AI tools to accelerate my development process for the Splitwise MVP, including my architectural prompts and an honest reflection on the technical mistakes the AI made that required my engineering oversight and manual intervention to fix.

## 🛠️ 1. AI Tools Used
- **Agentic AI Assistant (Google Gemini / Copilot):** I utilized the AI as an intelligent pair-programming assistant integrated into my IDE to rapidly scaffold boilerplate code, generate UI components, and assist with complex mathematical algorithms while I maintained full architectural control.

## 💬 2. Key Prompts Used
1. *"I need to implement a Greedy Algorithm to minimize debt transactions between group members. Generate the core mathematical graphing logic for net balances."*
2. *"Write a foundational React component with Tailwind CSS v4 for a premium Dark Mode theme using Slate-950 color variables."*
3. *"Draft the boilerplate Express.js route and multer configuration to accept a .csv file upload in memory."*
4. *"The xlsx parser logic you provided is throwing 42 anomalies for 42 rows. This is mathematically incorrect. Review your key-mapping logic for case-sensitivity."*

---

## ❌ 3. Three Concrete Cases Where the AI Was Wrong & My Interventions

While the AI was excellent for speed and boilerplate generation, it produced significant architectural and logical errors that required my engineering expertise to catch and correct.

### Case 1: Unscalable WebSocket Implementation for Serverless Environments
- **What the AI did wrong:** When I asked for a real-time group chat feature, the AI immediately generated code using `Socket.io` and `Pusher` for WebSockets. 
- **How I caught it:** I reviewed the generated code and recognized that deploying a persistent Node.js WebSocket connection to a serverless platform (like Vercel) would lead to dropped connections and scaling issues, as serverless environments tear down idle instances.
- **What I changed:** I discarded the AI's WebSocket approach entirely. Instead, I architected and instructed the AI to implement a highly robust **3-second HTTP Polling mechanism** using React's `useEffect`. This achieved the necessary "real-time" sync while perfectly adhering to stateless, serverless constraints.

### Case 2: The 100% False-Positive Anomaly Bug in Data Ingestion
- **What the AI did wrong:** While building the CSV/Excel data ingestion engine, the AI provided parsing logic using the `xlsx` package. It hardcoded the validation rules to look for strictly lowercase object keys (e.g., `data.amount`). 
- **How I caught it:** During my testing phase, I uploaded the provided Excel file and the UI reported **"42 rows processed, 42 anomalies detected"**. I knew this was impossible for a standard dataset. I debugged the code and discovered that the AI failed to account for `xlsx` preserving exact Excel header casing (e.g., `Amount`), causing all validation checks to evaluate as `undefined`.
- **What I changed:** I intervened and wrote a **Key Normalization Loop** that intercepts the raw data output, iterating over every object key to force lowercase string formatting and replace spaces with underscores before handing the data off to the validation pipeline.

### Case 3: Vercel SPA Routing 404 Errors
- **What the AI did wrong:** The AI successfully built the frontend routing using `react-router-dom`. However, it assumed a traditional static file server environment and failed to provide edge-network configuration.
- **How I caught it:** After deploying the app, client-side navigation worked, but whenever I manually refreshed the browser on a nested route (e.g., `/group/123`), the server threw a hard `404 Not Found` error. I realized the edge server was literally looking for a `/group/` directory that didn't exist.
- **What I changed:** I manually engineered a `vercel.json` configuration file at the root of the project with a `rewrites` rule. This forced all incoming traffic (`/(.*)`) to fall back to `/index.html`, allowing my React Router to properly mount and handle the URL paths client-side.
