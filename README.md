# SMARTCOOP

**Rubber Farming & Cooperative Management System** — a web application for managing a rubber-farming cooperative: membership, rubber production and loading batches, receipts, loans, credit scoring, member activity categorization, and Municipal Agriculture Office (MAO) support programs.

The project is a monorepo with two parts:

- **`backend/`** — Express + Prisma REST API on MySQL.
- **`frontend/`** — React 19 + Vite single-page app (Tailwind v4).

---

## Table of contents

- [Tech stack](#tech-stack)
- [Repository structure](#repository-structure)
- [Getting started](#getting-started)
- [Default login accounts](#default-login-accounts)
- [Roles & access](#roles--access)
- [Data model](#data-model)
- [API surface](#api-surface)
- [Important notes — business rules & algorithms](#important-notes--business-rules--algorithms)
- [Design system](#design-system)

---

## Tech stack

| Layer | Technology |
| --- | --- |
| API | Node.js, Express 4, ES modules |
| ORM / DB | Prisma 6, MySQL |
| Auth | JWT (`jsonwebtoken`) + `bcryptjs` password hashing |
| Validation | Zod |
| Security / logging | Helmet, CORS, Morgan |
| Frontend | React 19, Vite, `react-router` v8 |
| Styling | Tailwind CSS v4 (`@tailwindcss/vite`) |
| Frontend libs | axios, react-hook-form, recharts, lucide-react, jspdf |

---

## Repository structure

```
SMARTCOOP/
├── backend/
│   ├── server.js                 # entry — loads env, starts Express on PORT
│   ├── prisma/
│   │   ├── schema.prisma         # full database ERD
│   │   ├── migrations/           # Prisma migrations
│   │   └── seed.js               # seeds barangays, users, sample members
│   └── src/
│       ├── app.js                # Express app: middleware + route mounting
│       ├── config/db.js          # single shared PrismaClient
│       ├── middleware/           # authenticate, requireRole, errorHandler
│       ├── utils/                # jwt, password, httpError, activityLog
│       └── modules/<name>/       # one folder per domain (see below)
│           ├── <name>.routes.js
│           ├── <name>.controller.js
│           └── <name>.service.js
└── frontend/
    └── src/
        ├── main.jsx / App.jsx    # router + route-level role guards
        ├── components/           # ui.jsx design system, Layout, cards
        ├── context/AuthContext   # login/logout, current user
        ├── lib/                  # api (axios), format, usePagination
        └── pages/                # by domain: members/, finance/, production/, mao/
```

**Module pattern (backend):** each domain under `src/modules/` is split into `routes` (URL + role guard), `controller` (HTTP + Zod validation), and `service` (business logic + Prisma). Modules: `auth`, `users`, `members`, `applications` (membership), `loanApplications`, `barangays`, `production`, `finance`, `progression` (categorization), `notifications`, `mao`.

---

## Getting started

### Prerequisites

- **Node.js** 18+
- **MySQL** running (e.g. XAMPP — default `root` user, empty password, port 3306)

### 1. Backend

```bash
cd backend
npm install

# create your env file from the template and edit DATABASE_URL / JWT_SECRET
cp .env.example .env

npm run migrate      # apply Prisma migrations (creates tables)
npm run generate     # generate the Prisma client
npm run seed         # seed barangays, users, and sample members
npm run dev          # start API with auto-reload → http://localhost:4000
```

**Backend environment variables** (`backend/.env`):

```env
DATABASE_URL="mysql://root:@localhost:3306/smartcoop"
JWT_SECRET="change-this-to-a-long-random-string"
JWT_EXPIRES_IN="1d"
PORT=4000
CORS_ORIGIN="http://localhost:5173"
```

Backend scripts: `dev`, `start`, `migrate`, `generate`, `seed`, `studio` (Prisma Studio).

### 2. Frontend

```bash
cd frontend
npm install
npm run dev          # Vite dev server → http://localhost:5173
```

**Frontend environment variable** (`frontend/.env`), optional — defaults to `http://localhost:4000/api`:

```env
VITE_API_URL="http://localhost:4000/api"
```

Frontend scripts: `dev`, `build`, `preview`, `lint`.

---

## Default login accounts

Created by `npm run seed`:

| Username | Password | Role |
| --- | --- | --- |
| `admin` | `admin123` | ADMIN |
| `staff` | `staff123` | STAFF |
| `mao` | `mao123` | MAO |
| `juan` | `member123` | MEMBER (linked to `M-0001`) |

> Change these before any real deployment.

---

## Roles & access

Four roles (`Role` enum). Route access is enforced on the backend (`requireRole`) and mirrored on the frontend (`ProtectedRoute` with a `roles` prop).

| Role | Access |
| --- | --- |
| **ADMIN** | Everything, including User Management |
| **STAFF** | Membership, production, finance, notifications (no user management) |
| **MEMBER** | Self-service only: own profile, deliveries, receipts, notifications |
| **MAO** | Municipal Agriculture Office dashboard, members-by-barangay, notifications |

Auth flow: the frontend stores the JWT in `localStorage["smartcoop_token"]`; the shared axios instance (`lib/api.js`) attaches it as a Bearer token and auto-logs-out on a `401`.

---

## Data model

Core entities (see `backend/prisma/schema.prisma` for the full ERD):

- **User** — login accounts; a MEMBER user links to a `Member`.
- **Member** — cooperative member; carries `membershipType` (REGULAR/ASSOCIATE), `shareCapital`, and cached categorization fields (`deliveryScore`, `loanScore`, `activityScore`, `repaymentRate`, `activityCategory`).
- **Barangay** — village/locality a member belongs to.
- **MembershipApplication** — public application to join; on approval a `Member` is created (`APP-####` number).
- **LoadingBatch → RubberDelivery → Receipt** — production: a batch groups deliveries for a barangay + period; each delivery produces one receipt with itemized deductions.
- **Loan → LoanSchedule / LoanPayment** — a loan with its amortization schedule; payments are collected from delivery proceeds.
- **LoanApplication** — a member's loan request; on approval a `Loan` is issued (`LN-####` number).
- **CreditScore** — a computed credit-score row per evaluation (history is kept).
- **Notification**, **ActivityLog** — messaging and audit trail.
- **SupportProgram / SupportProgramRecipient / AffectedAreaTag** — MAO programs and area tagging.
- **AppSetting** — JSON config rows (e.g. algorithm tuning); keys `creditScoring` and `categorization`.

---

## API surface

All routes are mounted under `/api`. Health check: `GET /api/health`.

| Prefix | Purpose |
| --- | --- |
| `/api/auth` | Login, current user (`/me`) |
| `/api/users` | User management (admin) |
| `/api/members` | Member CRUD, member login creation, re-categorize |
| `/api/applications` | Membership applications (submit, review, approve/reject) |
| `/api/loan-applications` | Loan applications (submit, review, approve/reject) |
| `/api/barangays` | Barangay list/management |
| `/api/production` | Loading batches, deliveries, receipts |
| `/api/finance` | Loans, loan amortization, credit scoring |
| `/api/notifications` | Notifications |
| `/api/mao` | MAO dashboard, support programs, affected-area tags |

Errors return JSON `{ message, ... }`; Zod validation failures return `{ message, errors: { field: [...] } }` (surfaced field-by-field on the frontend).

---

## Important notes — business rules & algorithms

These are the rules that are **not obvious from the schema** and matter most when changing code.

### 1. Membership promotion (Associate → Regular)

Members start as **ASSOCIATE** and are **auto-promoted to REGULAR** once their **CBU (Capital Build-Up) total or share-capital savings reach ₱10,000** (`REGULAR_PROMOTION_THRESHOLD` in `members.service.js`). Promotion is one-way (never demotes) and is re-checked after deliveries (CBU changes) and capital changes.

### 2. Loan eligibility

**Only REGULAR members can take a loan** — but "Regular" and "has hit the ₱10,000 threshold" are the same population by design. Both the staff-issued loan (`loans.service.create`) and the member loan application (`loanApplications.service.create`) call `promoteIfEligible()` **before** the eligibility check, so anyone who has met the threshold qualifies immediately even if an earlier promotion trigger hadn't fired. Ineligible members get an error naming the ₱10,000 threshold.

### 3. Loan amortization — diminishing interest

Loans use **equal principal + diminishing interest** (`buildSchedule` in `loans.service.js`): each period charges a **fixed principal** (`principal ÷ term`) plus **interest on the remaining balance** (`balance × monthly rate`), so the total payment decreases over the term. The final period absorbs any rounding remainder so the balance closes at exactly 0.

Loan repayments are **collected automatically from rubber delivery proceeds** (`applyDeliveryToLoan`): only installments already due are collected, earliest first, capped by the delivery amount, inside the delivery-creation transaction. Clearing all installments sets the loan to `INACTIVE`.

### 4. Receipt deductions

Each delivery receipt computes:

```
net = gross − (loan + CBU + membership fee + supplies + dayong)
```

### 5. Agricultural Credit Scoring (`finance/credit.service.js`)

A **0–100 score** from three weighted pillars (each normalized 0–100), tunable via `AppSetting` key `"creditScoring"`:

| Pillar | Default weight | Based on |
| --- | --- | --- |
| Repayment history | 35% | on-time installments + fully repaid loans |
| Production consistency | 30% | 12-month delivery volume + how regularly they deliver |
| **Cooperative standing** | 35% | share capital, membership tenure, membership class |

> **Note:** Pillar 3 is labeled **"Cooperative standing"** (renamed from "Farm characteristics") — it reflects standing in the cooperative, not farm/land data, which the schema does not store. Internal field/config names still use `farm`/`farmScore` to stay compatible with historical `CreditScore.factors` rows.

The score maps to a **risk band** (LOW / MEDIUM / HIGH) with a lending recommendation and a suggested credit limit.

**Fairness handling for members without loan history:**

- **Reweighting** — a member with **no loans** has no meaningful repayment signal, so Pillar 1's weight is **redistributed proportionally across Pillars 2 & 3** instead of injecting a flat baseline. This avoids every never-borrowed member carrying the same padded score. Their `factors.repaymentScore` is `null` and `hasLoanHistory` is `false`.
- **Track-record gate** — a member with **no deliveries and no loans** has no track record, so **no score is computed** and they show as *"Not yet assessed"* rather than a number built only on cooperative standing.

### 6. Dynamic Member Categorization (`progression/progression.service.js`)

Classifies members as **Active / Moderate / Inactive / Not Applicable** for an evaluation period (default 30 days), tunable via `AppSetting` key `"categorization"`. Two indicators:

- **Delivery Score (DS)** — from rubber kilos delivered in the period (bands: ≥300 kg → 50, ≥100 kg → 30, else 10).
- **Loan Score (LS)** — from loan repayment rate `RR = paid ÷ due × 100` (≥90% → 50, ≥70% → 30, else 10).

| Member situation | How they're scored |
| --- | --- |
| **Has a loan** | `Activity Score = DS + LS`, then thresholds (Active ≥ 80, Moderate ≥ 50, else Inactive) |
| **No loan, but delivered this period** | **Delivery-only:** DS rescaled to the full 0–100 range (`DS ÷ 50 × 100`) so a strong deliverer can still reach Active |
| **No loan and no deliveries this period** | **Not Applicable** — no signal to judge |

> This makes categorization **fair to associates**, who can't take loans: a heavy-delivering associate reaches Active on deliveries alone instead of being stuck at "Not Applicable." Because it is **period-based**, an associate who delivered heavily last period but nothing this period drops to Not Applicable for the current period.

### 7. Application numbering

- Membership applications: **`APP-####`**
- Loan applications: **`LN-####`**
- Members: **`M-####`**

Each is generated from the current maximum with that prefix.

---

## Design system

The frontend intentionally runs **two coexisting visual systems**:

- **App shell** (everything behind login) — a Notion-esque, warm-neutral editorial look. Shared components live in `frontend/src/components/ui.jsx` (`Button`, `Input`, `Modal`, `Card`, `Badge`, `PageHeader`, `StatCard`, `Pagination`, `CategoryBadge`, `RiskBadge`, etc.). Green primary `#346538`, muted neutrals, hairline `#EAEAEA` borders.
- **"Tapping morning" brand** (public pages only: `Landing`, `Login`, `Apply`) — a rubber-tapping-themed palette in `frontend/src/lib/brandTokens.js` (`BRAND`) with matching motifs in `frontend/src/components/brand.jsx` (herringbone tapping-cut pattern, amber `#B9701F` accent).

When editing public pages, use the `BRAND` tokens + `brand.jsx` motifs; for anything behind `ProtectedRoute`, use the `ui.jsx` app-shell palette.
