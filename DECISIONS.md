# Decision Log (`DECISIONS.md`)

This log documents the key engineering decisions made during the design and build of the Shared Expenses App, the options evaluated, and why the final choices were chosen.

---

## 1. Backend Stack: Node.js & Express (TypeScript) vs. Django (Python)
* **Options Considered**:
  1. *Django (Python)*: Mentions in the job description, built-in ORM, admin panel.
  2. *Node.js & Express (TypeScript)*: Lightweight, fast routing, completely asynchronous, high user familiarity.
* **Why chosen**: Express with TypeScript was chosen to meet the strict **2-day development timeline**. Express’s simplicity and micro-framework model allowed us to write a highly modular, readable validation parser without fighting Django’s heavy settings configurations and migration patterns. TypeScript was integrated to guarantee type safety across raw CSV objects, preventing runtime splitting exceptions.

---

## 2. Database Layer: Prisma ORM vs. Raw SQL (pg) vs. Sequelize
* **Options Considered**:
  1. *Raw SQL Queries (`pg` module)*: No abstraction, high performance, but prone to SQL injection, syntax errors, and slower migrations.
  2. *Sequelize ORM*: Traditional JS ORM, but lacks native TypeScript type generation out of the box.
  3. *Prisma ORM*: Type-safe client, declarative schema modeling, auto-generated migrations, and powerful database relationships.
* **Why chosen**: **Prisma ORM** was selected because it generates type-safe database queries automatically matching our schema. This prevents database field mismatch bugs and ensures that during the 45-minute live review, the schema is easily readable inside a single `schema.prisma` file.

---

## 3. Authentication: Custom JWT + Bcrypt vs. Third-Party Auth (Clerk)
* **Options Considered**:
  1. *Clerk Auth*: Pre-built login pages, secure, but requires remote servers and webhooks to synchronize users to our local database.
  2. *Custom JWT + Bcrypt*: Token-based session management managed fully inside our local codebase.
* **Why chosen**: **Custom JWT + Bcrypt** was selected to ensure the system is entirely self-contained (no external API calls or webhook lags). This makes it straightforward to explain in a technical interview: we can trace password hashing in `authController.ts` and token validation in `authMiddleware.ts` line-by-line without relying on a black-box cloud service.

---

## 4. Calculations: Temporal Splits vs. General Splitting
* **Options Considered**:
  1. *General Splits*: Dividing the total amount equally among all current group members.
  2. *Temporal Date-Scoped Splits (Temporal Groups)*: Storing membership intervals `[joinedAt, leftAt]` and checking every expense date to exclude inactive users.
* **Why chosen**: **Temporal Date-Scoped Splits** were selected. This is the only way to satisfy Sam's rule (not paying for March electricity) and Meera's rule (not paying for April expenses). It maintains ledger integrity and ensures balances are mathematically accurate.

---

## 5. DevOps: Docker Compose vs. Local Execution Scripts
* **Options Considered**:
  1. *Local Execution*: Requiring the evaluator to install Node, PostgreSQL, and client tools locally and configure ports.
  2. *Docker Compose*: Bundling the PostgreSQL db, Express API, and React client into a multi-container environment configured with one network.
* **Why chosen**: **Docker Compose** was selected. It guarantees that the project runs in the exact same environment on the evaluator’s computer as it does during development, solving local dependency conflicts instantly.

---

## 6. CI/CD: GitHub Actions vs. Local Jenkins Setup
* **Options Considered**:
  1. *Local Jenkins Server*: Heavy CI system running locally, but takes hours to configure webhooks, JDKs, and port forwarding.
  2. *GitHub Actions*: Cloud-hosted pipelines running on every git push, configured in a single YAML file.
* **Why chosen**: **GitHub Actions** was chosen to save development time. Setting up Jenkins locally would take focus away from the primary business logic (anomaly parser, split calculator). GitHub Actions provides seamless CI checks for PRs and builds in minutes.
