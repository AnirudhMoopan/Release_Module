# 🚀 Release Module

![React](https://img.shields.io/badge/React-19.x-61DAFB?style=for-the-badge&logo=react&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-8.x-646CFF?style=for-the-badge&logo=vite&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4.x-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)
![.NET](https://img.shields.io/badge/.NET-8.0-512BD4?style=for-the-badge&logo=dotnet&logoColor=white)
![Oracle](https://img.shields.io/badge/Oracle-DB-F80000?style=for-the-badge&logo=oracle&logoColor=white)

---

## 📖 What Is This?

The **Release Module** is a full-stack enterprise software deployment gateway that manages the complete lifecycle of production release requests — from submission through a multi-level approval chain to final deployment.

It is used internally by software teams to:
- **Submit** Change Request Forms (CRFs) and Ticket-based release requests
- **Track** the status of each request through a 4-step approval pipeline
- **Approve/Reject** requests at each authorization level (TL → SPM → CTO)
- **Execute** the actual production deployment with lock-based concurrency control
- **Revert** deployed releases through a separate rollback approval chain
- **Audit** all release activity with full history and downloadable reports

### Approval Workflow

```
Requester (Developer)
     │
     ▼
Team Lead (Recommend)
     │
     ▼
SPM (Verify)
     │
     ▼
CTO (Approve)
     │
     ▼
Release Team (Deploy to Production)
```

Each step has full audit trail (who, when, comments), push notifications, and revert capabilities.

### Flow Details & State Machine

Every release request transitions through specific states, driving the UI and access control:

1. **Submission (Status 1: Pending):** A Developer submits an EXP or CAB request. It enters the TL's queue.
2. **Recommendation (Status 2: Recommended):** The Team Lead (TL) reviews and recommends the request. It enters the SPM's queue.
3. **Verification (Status 3: Verified):** The Senior Project Manager (SPM) verifies the request. It enters the CTO's queue.
4. **Approval (Status 4: Approved):** The CTO provides final approval. At this point, the request is ready for deployment.
5. **Execution (Status 5: Released):** The Release Team (DB and/or Application) executes the deployment. Concurrency locks ensure only one team member processes a request at a time. For **Dual** requests, both DB and App teams must sign off before the request is fully Released.
6. **Revert Workflow (Status 6-10):** If a deployed release causes issues, the original requester can trigger a Revert, generating a separate track through the approval chain (Revert Recommended → Revert Verified → Revert Approved → Revert Released).
7. **Rejection (Status 0: Returned):** Any approver can reject/return a request at any step, sending it back to the developer with a mandatory comment.

### Release Types

| Type | Code | Description |
|------|------|-------------|
| **EXP** (Expedite) | `EXP_CRF` / `EXP_TICKET` | Urgent releases that bypass the normal CAB schedule |
| **CAB** (Change Advisory Board) | `CAB_CRF` / `CAB_TICKET` | Scheduled releases on Monday/Thursday windows |

### Requirement Types

| ID | Type | Who Deploys |
|----|------|-------------|
| 1 | Database | DB Release Team |
| 2 | Application | App Release Team |
| 3 | Both (Dual) | DB + App Release Team (both must sign off) |

---

## 🖥️ Pages & Features

### 🔐 Login Page (`/Login`)
- Username/password authentication against `EMPLOYEE_MASTER` table
- **Quick Login** buttons for demo/testing (Requester, Team Lead, SPM, CTO, Release)
- All demo accounts use password: `admin`
- Session management via `sessionStorage` with auto-timeout (10 min inactivity)

### 📊 Developer Dashboard (`/Dashboard/Index`)
- Submit new EXP or CAB release requests (CRF-based or Ticket-based)
- **Live progress tracker** — 5-step stepper showing where each request is in the pipeline
- Summary stats: Total Released, Reverted, Returned
- **Revert Release** — trigger a rollback after deployment (opens its own approval chain)
- **🎉 Celebration popup** — confetti animation when a release goes live
- File upload: UAT Sign-off Doc + Production Release Doc (stored as BLOBs)

### ✅ Approver Dashboard (`/Dashboard/Approver`)
- Shared by **Team Lead** (stepOrder=1), **SPM** (stepOrder=2), **CTO** (stepOrder=3)
- Shows pending items for the logged-in user's approval level
- EXP/CAB toggle filter with animated pill indicator
- **CTO-only**: Combined release report download (CSV export)
- Queue auto-deduplication and revert tracking
- One-click navigation to Approval Details

### 📋 Approval Details (`/Release/ApproverDetails`)
- Full request detail view: subject, description, commit ID, publish path, requirement type
- In-app document viewer for uploaded UAT/Production docs
- Approve / Reject with mandatory comments
- Previous step comments visible (recommender → verifier → approver)
- Revert request details with rollback reason

### 🚀 Release Dashboard (`/Dashboard/Release`)
- **Release Team only** (stepOrder=4)
- Left sidebar with action queue + release history link
- KPI cards: Ready to Deploy, Upcoming, Expedite Pending, Database Changes
- **Lock-based concurrency**: locks a request before deployment to prevent conflicts
- Partial release support for DUAL (DB+App) requests
- Upcoming pipeline visibility (items still in approval)
- Role-filtered view: DB Release sees only DB items, App Release sees only App items

### ⚡ Execution Details (`/Release/ExecutionDetails`)
- The actual deployment execution page
- File attachments viewer for release artifacts
- Release comment submission
- Separate DB Release / App Release confirmation for dual-type requests
- Revert execution with independent DB/App revert flow

### 🔍 EXP Details & CAB Details (`/Release/ExpDetails`, `/Release/CabDetails`)
- Detailed request view with full approval chain timeline
- Schema browser for database changes
- Back-navigation to the correct dashboard based on user role

### 📜 Release History (`/Release/History`)
- Searchable, paginated history of all completed releases
- Filter by EXP/CAB, date range, and status
- Links to detailed report view

### 📊 Reports (`/Reports/ExpReport`, `/Reports/CabReport`)
- EXP and CAB release reports with filterable data grids
- Drill-down to individual report details (`/Reports/Details`)

### 🔎 Global Search
- `HeaderSearch` component available on every dashboard
- Search across all request types (CRF ID, Ticket ID, REQ ID, subject)
- Results link directly to the detailed view

### 🔔 Push Notifications (PWA)
- Web Push via VAPID (Service Worker registered in `sw.js`)
- Real-time notifications when requests move through the pipeline
- Works even when the browser tab is closed

---

## 🏗️ Architecture

```
┌──────────────────────────────────────────────┐
│              Frontend (React SPA)            │
│   React 19 • Vite 8 • TypeScript • Tailwind │
│   Framer Motion • Lottie • Canvas Confetti   │
├──────────────────────────────────────────────┤
│            Vite Dev Proxy (/api)             │
├──────────────────────────────────────────────┤
│         Backend (.NET 8 Web API)             │
│   ASP.NET Core • Entity Framework Core       │
│   Oracle.EntityFrameworkCore • WebPush        │
├──────────────────────────────────────────────┤
│             Oracle Database                  │
│   EXP_REQUEST • CAB_REQUEST • TICKET_REQUEST │
│   EMPLOYEE_MASTER • TBL_REQUEST_APPROVALS    │
└──────────────────────────────────────────────┘
```

---

## ⚡ Quick Start

### Prerequisites

| Tool | Version | Required For |
|------|---------|-------------|
| [Node.js](https://nodejs.org/) | 18+ | Frontend |
| [.NET SDK](https://dotnet.microsoft.com/download/dotnet/8.0) | 8.0 | Backend |
| [Oracle Database](https://www.oracle.com/database/) | 19c+ | Data Store |

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/release-module.git
cd release-module
```

### 2. Frontend Setup

```bash
cd Frontend
npm install
npm run dev
```

The frontend starts at **http://localhost:5173/Release_Module/**

> Use the **Quick Login** buttons on the login page to test different roles without a backend.

### 3. Backend Setup

```bash
cd ReleaseModule/ReleaseModule
```

Copy the config template and fill in your credentials:

```bash
# Edit appsettings.json with your database connection string
```

```json
{
  "ConnectionStrings": {
    "OracleDb": "User Id=YOUR_USER;Password=YOUR_PASSWORD;Data Source=//YOUR_HOST:1521/YOUR_SERVICE_NAME;Connection Lifetime=180;Connection Timeout=180;Min Pool Size=2;"
  },
  "Vapid": {
    "subject": "mailto:your-email@example.com",
    "publicKey": "YOUR_VAPID_PUBLIC_KEY",
    "privateKey": "YOUR_VAPID_PRIVATE_KEY"
  }
}
```

Run the backend:

```bash
dotnet run
```

The API starts at **https://localhost:7071** with Swagger UI at `/swagger`.

### 4. Connect Frontend to Backend

In `Frontend/vite.config.ts`, the proxy is already configured:

```typescript
server: {
  proxy: {
    '/api': {
      target: 'https://localhost:7071',
      changeOrigin: true,
      secure: false,
    },
  },
},
```

---

## 🗄️ Database Setup

The backend uses **Oracle Database** with Entity Framework Core. Below are all the tables required.

### Required Tables

#### `EMPLOYEE_MASTER` (Schema: `AML_HRM`)
User authentication and identity.

```sql
CREATE TABLE AML_HRM.EMPLOYEE_MASTER (
    EMP_CODE       NUMBER PRIMARY KEY,
    EMP_NAME       VARCHAR2(200),
    PASSWORD       VARCHAR2(500),       -- SHA256 hashed
    DEPARTMENT_ID  NUMBER,
    STATUS_ID      NUMBER               -- 1 = Active
);
```

#### `TBL_REQUEST_APPROVALS`
Role-based access control — maps users to approval steps.

```sql
CREATE TABLE TBL_REQUEST_APPROVALS (
    EMP_CODE    VARCHAR2(20),
    EMP_NAME    VARCHAR2(200),
    ROLE_STATUS VARCHAR2(50),           -- TL / SPM / Approver / DB_RELEASE / APPLICATION_RELEASE
    STEP_ORDER  NUMBER,                 -- 1=Recommend, 2=Verify, 3=Approve, 4=Release
    CONSTRAINT PK_REQUEST_APPROVALS PRIMARY KEY (EMP_CODE, STEP_ORDER)
);
```

#### `TBL_TEAM_DTLS`
Team hierarchy — maps developers to their Team Leads and SPMs.

```sql
CREATE TABLE TBL_TEAM_DTLS (
    ID          NUMBER PRIMARY KEY,
    EMP_CODE    VARCHAR2(20) NOT NULL,
    EMP_NAME    VARCHAR2(200),
    ROLE        VARCHAR2(20),           -- DEV / TL / SPM
    PARENT_ID   NUMBER,                 -- FK to TBL_TEAM_DTLS.ID (TL → SPM chain)
    STATUS      NUMBER DEFAULT 1,       -- 1=Active, 0=Inactive
    CREATED_DATE DATE DEFAULT SYSDATE
);
```

#### `EXP_REQUEST`
Expedite release requests (CRF-based).

```sql
CREATE TABLE EXP_REQUEST (
    ID                      NUMBER GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
    CRF_ID                  NUMBER,
    USER_ID                 NUMBER,
    SUBJECT                 VARCHAR2(500)  NOT NULL,
    CHANGES_TO_MADE         CLOB           NOT NULL,
    PUBLISH_PATH            VARCHAR2(1000),
    COMMIT_ID               VARCHAR2(200),
    REASON_EXPEDITE         VARCHAR2(1000) NOT NULL,
    REQUIREMENT_TYPE        NUMBER,         -- 1=DB, 2=App, 3=Both
    UAT_SIGNOFF_DOC         BLOB,
    UAT_FILE_NAME           VARCHAR2(500),
    UAT_CONTENT_TYPE        VARCHAR2(200),
    PROD_RELEASE_DOC        BLOB,
    PROD_FILE_NAME          VARCHAR2(500),
    PROD_CONTENT_TYPE       VARCHAR2(200),
    DBTYPE                  VARCHAR2(100),
    CREATED_DATE            DATE DEFAULT SYSDATE,
    STATUS                  NUMBER DEFAULT 1,   -- See status codes below
    -- Recommendation (Step 1)
    RECOMMENDED_BY          VARCHAR2(20),
    RECOMMENDED_DATE        DATE,
    RECOMMENDER_COMMENT     VARCHAR2(500),
    -- Verification (Step 2)
    APPROVER1_BY            VARCHAR2(20),
    APPROVER1_DATE          DATE,
    APPROVER1_COMMENT       VARCHAR2(500),
    -- Approval (Step 3)
    APPROVER2_BY            VARCHAR2(20),
    APPROVER2_DATE          DATE,
    APPROVER2_COMMENT       VARCHAR2(500),
    -- Return (Rejection)
    RETURN_BY               VARCHAR2(20),
    RETURN_DATE             DATE,
    RETURN_COMMENT          VARCHAR2(500),
    -- Release Execution (Step 4)
    DB_ASSIGNED_TO          VARCHAR2(20),
    DB_ASSIGNED_DATE        DATE,
    APP_ASSIGNED_TO         VARCHAR2(20),
    APP_ASSIGNED_DATE       DATE,
    DB_RELEASED_BY          VARCHAR2(20),
    DB_RELEASED_DATE        DATE,
    DB_RELEASED_COMMENT     VARCHAR2(500),
    APP_RELEASED_BY         VARCHAR2(20),
    APP_RELEASED_DATE       DATE,
    APP_RELEASED_COMMENT    VARCHAR2(500),
    -- Revert Flow
    REVERT_COMMENT          VARCHAR2(500),
    REVERT_DATE             DATE,
    REVERT_RECOMMENDED_BY   VARCHAR2(20),
    REVERT_RECOMMENDED_DATE DATE,
    REVERT_RECOMMENDER_COMMENT VARCHAR2(500),
    REVERT_APPROVER1_BY     VARCHAR2(20),
    REVERT_APPROVER1_DATE   DATE,
    REVERT_APPROVER1_COMMENT VARCHAR2(500),
    REVERT_APPROVER2_BY     VARCHAR2(20),
    REVERT_APPROVER2_DATE   DATE,
    REVERT_APPROVER2_COMMENT VARCHAR2(500),
    REVERT_DB_ASSIGNED_TO   VARCHAR2(20),
    REVERT_DB_ASSIGNED_DATE DATE,
    REVERT_APP_ASSIGNED_TO  VARCHAR2(20),
    REVERT_APP_ASSIGNED_DATE DATE,
    REVERT_DB_RELEASED_BY   VARCHAR2(20),
    REVERT_DB_RELEASED_DATE DATE,
    REVERT_DB_RELEASED_COMMENT VARCHAR2(500),
    REVERT_APP_RELEASED_BY  VARCHAR2(20),
    REVERT_APP_RELEASED_DATE DATE,
    REVERT_APP_RELEASED_COMMENT VARCHAR2(500),
    -- Metadata
    RELEASE_CELEBRATION_SEEN NUMBER DEFAULT 0,
    MOBILE_NUMBER           VARCHAR2(20),
    REQ_ID                  VARCHAR2(50) GENERATED ALWAYS AS ('EXP-' || TO_CHAR(ID)) VIRTUAL
);
```

#### `CAB_REQUEST`
CAB (Change Advisory Board) release requests. Same structure as `EXP_REQUEST` with additional CAB scheduling fields.

> The schema is identical to `EXP_REQUEST` — create it the same way with table name `CAB_REQUEST` and `REQ_ID` formula `'CAB-' || TO_CHAR(ID)`.

#### `TICKET_REQUEST`
Ticket-based release requests (linked to helpdesk tickets instead of CRFs). Same approval/release/revert columns as above.

#### `TBL_CRFT_MST`
CRF (Change Request Form) master — source data from upstream ticketing system.

```sql
CREATE TABLE TBL_CRFT_MST (
    CRF_ID         NUMBER PRIMARY KEY,
    SUBJECT        VARCHAR2(500),
    DESCRIPTION    CLOB,
    STATUS_ID      NUMBER,
    USER_TARGET_DT DATE
);
```

#### `TBL_CRFT_STATUS_MST`
Status lookup for CRFs.

```sql
CREATE TABLE TBL_CRFT_STATUS_MST (
    STATUS_ID   NUMBER PRIMARY KEY,
    STATUS_NAME VARCHAR2(100)
);
```

#### `RELEASE_SCHEMA`
Available database schemas for release execution.

```sql
CREATE TABLE RELEASE_SCHEMA (
    SCHEMA_NAME VARCHAR2(100)
);
```

#### `PUSH_SUBSCRIPTIONS`
Web Push notification subscriptions.

```sql
CREATE TABLE PUSH_SUBSCRIPTIONS (
    ID           NUMBER GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
    EMP_CODE     VARCHAR2(20),
    ENDPOINT     VARCHAR2(2000),
    P256DH       VARCHAR2(500),
    AUTH         VARCHAR2(200),
    CREATED_DATE DATE DEFAULT SYSDATE,
    DEVICE_INFO  VARCHAR2(500)
);
```

#### `LOGINLOGS`
Audit log for login attempts.

```sql
CREATE TABLE LOGINLOGS (
    LOGID     NUMBER GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
    EMPCODE   VARCHAR2(20),
    USERNAME  VARCHAR2(200),
    LOGINTIME DATE DEFAULT SYSDATE,
    SUCCESS   VARCHAR2(1)      -- 'Y' or 'N'
);
```

### Status Codes

| Code | Status | Description |
|------|--------|-------------|
| 0 | Returned | Request rejected by any approver |
| 1 | Pending | Submitted, awaiting TL recommendation |
| 2 | Recommended | TL approved, awaiting SPM verification |
| 3 | Verified | SPM approved, awaiting CTO approval |
| 4 | Approved | CTO approved, ready for release |
| 5 | Released | Successfully deployed to production |
| 6 | Revert Requested | Developer requested a rollback |
| 7 | Revert Recommended | TL approved the revert |
| 8 | Revert Verified | SPM approved the revert |
| 9 | Revert Approved | CTO approved the revert |
| 10 | Revert Released | Rollback deployed to production |

---

## 📂 Project Structure

```
release-module/
├── Frontend/                          # React SPA
│   ├── public/
│   │   ├── images/                    # Static images & backgrounds
│   │   ├── manifest.json             # PWA manifest
│   │   ├── sw.js                     # Service Worker (push notifications)
│   │   └── loading.lottie            # Loading animation
│   ├── src/
│   │   ├── assets/css/               # Vanilla CSS design system
│   │   │   └── pages/                # Per-page stylesheets
│   │   ├── components/
│   │   │   ├── AppLayout.tsx          # Sidebar layout for developer dashboard
│   │   │   ├── DocumentViewer.tsx     # In-app file viewer (PDF, images)
│   │   │   ├── DragDropUpload.tsx     # File upload component
│   │   │   ├── HeaderSearch.tsx       # Global search bar
│   │   │   ├── PageTransition.tsx     # Framer Motion page transitions
│   │   │   ├── ProtectedRoute.tsx     # Auth guard (demo mode: open)
│   │   │   ├── SearchPopup.tsx        # Search results modal
│   │   │   └── Signature.tsx          # Easter egg signature component
│   │   ├── hooks/
│   │   │   └── useSessionTimeout.ts   # Session management hook
│   │   ├── pages/
│   │   │   ├── Login.tsx              # Login + Quick Login buttons
│   │   │   ├── Dashboard.tsx          # Developer dashboard (flow tracker)
│   │   │   ├── NotFound.tsx           # 404 page
│   │   │   ├── Dashboard/
│   │   │   │   ├── Approver.tsx       # TL / SPM / CTO approval queue
│   │   │   │   └── ReleaseDashboard.tsx # Release team execution queue
│   │   │   ├── Release/
│   │   │   │   ├── ApproverDetails.tsx # Request detail + approve/reject
│   │   │   │   ├── ExecutionDetails.tsx # Release execution page
│   │   │   │   ├── ExpDetails.tsx     # EXP request detail view
│   │   │   │   ├── CabDetails.tsx     # CAB request detail view
│   │   │   │   └── History.tsx        # Release history
│   │   │   ├── Reports/
│   │   │   │   ├── ExpReport.tsx      # EXP release reports
│   │   │   │   ├── CabReport.tsx      # CAB release reports
│   │   │   │   └── ReportDetails.tsx  # Individual report detail
│   │   │   └── ExpRequest/
│   │   │       └── Flow.tsx           # Request submission flow
│   │   ├── services/
│   │   │   └── api.ts                 # Centralized API client (1100+ lines)
│   │   └── App.tsx                    # Router configuration
│   ├── vite.config.ts                 # Build config + API proxy
│   └── package.json
│
├── ReleaseModule/                     # .NET 8 Backend
│   └── ReleaseModule/
│       ├── Controllers/
│       │   ├── ExpRequestController.cs        # EXP CRF endpoints
│       │   ├── CabRequestController.cs        # CAB CRF endpoints
│       │   ├── CabTicketRequestController.cs  # Ticket-based endpoints
│       │   ├── CrfCabExpRevertController.cs   # Revert workflow endpoints
│       │   ├── ExpReportController.cs         # Reporting endpoints
│       │   ├── ReleaseLockController.cs       # Concurrency lock management
│       │   ├── PushNotificationController.cs  # Web Push (VAPID)
│       │   └── PasswordHasher.cs              # SHA256 password hashing
│       ├── Data/
│       │   └── ApplicationDbContext.cs        # EF Core Oracle mappings
│       ├── Models/
│       │   ├── LoginLog.cs            # All entity models
│       │   ├── Employee.cs            # Employee entity
│       │   └── LoginViewModel.cs      # Request/Response DTOs
│       ├── Program.cs                 # App startup + Oracle warmup
│       └── appsettings.json           # Configuration (secrets here)
│
└── .gitignore                         # Excludes bin/, obj/, dist/, secrets
```

---

## 🔧 Configuration

### Environment Variables / Config

| Key | Location | Description |
|-----|----------|-------------|
| `ConnectionStrings:OracleDb` | `appsettings.json` | Oracle connection string |
| `Vapid:publicKey` | `appsettings.json` | VAPID public key for push notifications |
| `Vapid:privateKey` | `appsettings.json` | VAPID private key (keep secret!) |
| `Vapid:subject` | `appsettings.json` | Contact email for VAPID |

### Generate VAPID Keys

```bash
npx web-push generate-vapid-keys
```

Copy the generated keys into `appsettings.json`.

### Frontend Proxy Target

Edit `vite.config.ts` to point to your backend:

```typescript
proxy: {
  '/api': {
    target: 'https://your-backend-url:7071',
    changeOrigin: true,
    secure: false,
  },
},
```

---

## 🏗️ Build for Production

### Frontend

```bash
cd Frontend
npm run build
```

Output goes to `Frontend/dist/`. Deploy to any static hosting (IIS, Nginx, etc.) under the `/Release_Module/` base path.

### Backend

```bash
cd ReleaseModule/ReleaseModule
dotnet publish -c Release -o ./publish
```

Deploy to IIS or run as a standalone service.

---

## 🧪 Demo Mode

The frontend includes a **demo mode** that works without a backend:

| Username | Password | Role | Dashboard |
|----------|----------|------|-----------|
| `requester` | `admin` | Developer | `/Dashboard/Index` |
| `teamlead` | `admin` | Team Lead (Recommender) | `/Dashboard/Approver` |
| `verifier` | `admin` | SPM (Verifier) | `/Dashboard/Approver` |
| `approver` | `admin` | CTO (Approver) | `/Dashboard/Approver` |
| `dbrelease` | `admin` | DB Release Team | `/Dashboard/Release` |
| `apprelease` | `admin` | App Release Team | `/Dashboard/Release` |

> Quick login buttons are on the left panel of the login page for one-click access.

---

## 🛠️ Tech Stack Details

### Frontend
| Library | Version | Purpose |
|---------|---------|---------|
| React | 19.x | UI framework |
| Vite | 8.x | Build tool + dev server |
| TypeScript | 5.9 | Type safety |
| Tailwind CSS | 4.x | Utility-first styling |
| Framer Motion | 12.x | Page transitions + animations |
| React Router | 7.x | Client-side routing (HashRouter) |
| Lottie Player | 1.6 | Loading animations |
| Canvas Confetti | 1.9 | Celebration effects |

### Backend
| Package | Version | Purpose |
|---------|---------|---------|
| ASP.NET Core | 8.0 | Web API framework |
| Entity Framework Core | 8.0 | ORM |
| Oracle.EntityFrameworkCore | 8.21 | Oracle DB provider |
| WebPush | 1.0.12 | Push notifications (VAPID) |
| Swashbuckle | 6.6.2 | Swagger/OpenAPI docs |

---

## 📄 License

MIT
