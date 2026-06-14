# Shared Expenses App

A full-stack application built for campus placement evaluation. It parses historic group spreadsheet exports with messy anomalies, interactively resolves conflicts, and calculates simplified multi-currency balances for dynamic group memberships.

---

## 🚀 Tech Stack

* **Frontend**: React (Vite) + Tailwind CSS + Vanilla CSS Layouts
* **Backend**: Node.js + Express (TypeScript)
* **Database**: PostgreSQL with Prisma ORM
* **DevOps**: Docker & docker-compose

---

## 📂 Project Structure

```text
SPREETAIL Project/
├── server/                 # Express Backend (TypeScript)
│   ├── prisma/             # Prisma schema and migration scripts
│   ├── src/
│   │   ├── controllers/    # Express controllers (auth, groups, expenses)
│   │   ├── middleware/     # JWT authentication & error verification
│   │   ├── services/       # Debt simplification, CSV parser, currency conversion
│   │   └── index.ts        # Server entry point
│   ├── Dockerfile
│   └── package.json
├── client/                 # React Frontend
│   ├── src/
│   │   ├── components/     # UI elements (Staging wizard, ledger audit)
│   │   ├── pages/          # Auth pages, Dashboard, Groups
│   │   └── index.css       # Tailwind & custom CSS variables
│   ├── Dockerfile
│   └── package.json
├── docker-compose.yml      # Local orchestration of web app, API, and PostgreSQL
├── .github/workflows/      # GitHub Actions CI/CD workflows
├── README.md
├── SCOPE.md                # Anomaly Log & Database Schema details
├── DECISIONS.md            # Design and Engineering Decision Log
├── AI_USAGE.md             # AI tool collaboration history
└── architecture.md         # System Architecture & Endpoint Logic Specifications
```

---

## 🛠️ Quick Start (Docker)

To spin up the database, Express backend, and React frontend in a single command, run:

```bash
docker compose up --build
```

* **Frontend Dashboard**: `http://localhost:3000`
* **Backend API**: `http://localhost:5000`
* **PostgreSQL Database**: `localhost:5432`

---

## 📦 Manual Setup

### 1. Database & Backend Setup
1. Navigate to the `/server` directory:
   ```bash
   cd server
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set up your `.env` file (see `.env.example` in the directory).
4. Run migrations:
   ```bash
   npx prisma migrate dev
   ```
5. Start the backend:
   ```bash
   npm run dev
   ```

### 2. Frontend Setup
1. Navigate to the `/client` directory:
   ```bash
   cd client
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the Vite server:
   ```bash
   npm run dev
   ```
