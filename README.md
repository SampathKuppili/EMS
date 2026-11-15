# LeaveFlow - Enterprise Leave Management System (EMS)

A secure, role-based Leave Management System designed for high-growth teams and startups. Built with a robust **Django REST Framework** backend and a responsive **React + TypeScript + Vite** frontend.

---

## 🌟 Key Features

1. **Role-Based Access Control (RBAC)**
   - **Admin / HR**: Manage employees, organizational hierarchies, leave categories, public holidays, allocate annual quotas, and view consequential action audit logs.
   - **Manager**: Review pending leave applications for assigned team members, approve/reject requests with custom remarks, and track department coverage.
   - **Employee**: Apply for time off, view live server-calculated working day previews, track application history, cancel active leaves, and update profile contact details.

2. **Leave Business Rules & Durations**
   - **Dynamic Server-Side Calculation**: Computes working days excluding weekends (Saturday/Sunday) and declared company public holidays.
   - **Half-Day Support**: Supports 0.5-day leaves on single working days.
   - **Overlapping Request Prevention**: Prevents concurrent applications across identical or intersecting active dates.
   - **Atomic Concurrency Protection**: Deducts balances atomically with database row locking (`select_for_update`), guaranteeing balance consistency and idempotency against duplicate submissions.
   - **Cancellation Balance Reversals**: Cancelling an approved leave automatically refunds deducted days to the employee's balance.

3. **Analytics, Notifications & Calendar**
   - **Leave Calendar**: Monthly visual schedule displaying team absences and office holidays.
   - **Real-Time Notifications**: Instant alerts when requests are submitted, approved, rejected, or cancelled.
   - **Management Reports**: Breakdown of leave consumption by category and departmental absence distribution.

---

## 🏗️ Tech Stack

- **Backend**: Python 3.14, Django 6.1, Django REST Framework, SimpleJWT, `psycopg` (PostgreSQL / SQLite dev fallback), `django-cors-headers`, `django-filter`.
- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS v4, React Router 7, Axios, Lucide Icons.

---

## 📁 Repository Structure

```text
EMS/
├── backend/
│   ├── apps/
│   │   ├── accounts/         # Custom User model, auth serializers, profile views
│   │   ├── organization/     # Departments, EmployeeProfile, Holidays
│   │   ├── leave/            # LeaveType, LeaveBalance, LeaveRequest & duration engine
│   │   ├── approvals/        # ApprovalHistory & atomic approval/cancellation services
│   │   ├── notifications/    # Notifications model and REST endpoints
│   │   └── reports/          # Audit logs & management summary reports
│   ├── core/                 # Django settings, urls, wsgi, asgi
│   ├── tests/                # Automated backend test suite
│   ├── requirements.txt      # Python dependencies
│   ├── .env.example          # Backend environment variables template
│   └── manage.py
├── frontend/
│   ├── src/
│   │   ├── api/              # Axios client with JWT refresh interceptor & types
│   │   ├── components/       # Navbar, Sidebar, ProtectedRoute, StatusBadge
│   │   ├── context/          # AuthContext for session management
│   │   ├── pages/            # Role-aware screens (Dashboard, Apply, Inbox, etc.)
│   │   ├── App.tsx           # React router configuration
│   │   └── main.tsx
│   ├── package.json
│   ├── vite.config.ts        # Vite build & backend API proxy configuration
│   └── .env.example
├── .gitignore
└── README.md
```

---

## 🚀 Quick Start Guide

### 1. Prerequisites
- Python 3.12+ (existing `venv/` is configured in the workspace)
- Node.js 18+ & npm

---

### 2. Backend Setup

1. **Activate Virtual Environment** (Windows PowerShell):
   ```powershell
   .\venv\Scripts\Activate.ps1
   ```

2. **Configure Environment Variables**:
   Copy `backend/.env.example` to `backend/.env`:
   ```powershell
   Copy-Item backend\.env.example backend\.env
   ```

3. **Database Configuration**:
   - By default, `USE_POSTGRES=False` uses SQLite for immediate development without database configuration.
   - To use **PostgreSQL**, update `backend/.env`:
     ```env
     USE_POSTGRES=True
     DB_NAME=ems_db
     DB_USER=postgres
     DB_PASSWORD=your_postgres_password
     DB_HOST=localhost
     DB_PORT=5432
     ```

4. **Run Migrations**:
   ```powershell
   cd backend
   python manage.py migrate
   ```

5. **Seed Demo Data & Accounts**:
   ```powershell
   python manage.py seed_data
   ```

6. **Run Backend Test Suite**:
   ```powershell
   python manage.py test tests
   ```

7. **Start Django Development Server**:
   ```powershell
   python manage.py runserver 8000
   ```

---

### 3. Frontend Setup

1. **Navigate to `frontend/`**:
   ```powershell
   cd frontend
   ```

2. **Install Dependencies** (already installed in workspace):
   ```powershell
   npm install
   ```

3. **Verify Build**:
   ```powershell
   npm run build
   ```

4. **Start Vite Dev Server**:
   ```powershell
   npm run dev
   ```
   Open **http://localhost:5173** in your browser.

---

## 🔑 Demo Accounts

The `python manage.py seed_data` command creates pre-configured demo users across all roles:

| Role | Email | Password | Responsibilities |
| :--- | :--- | :--- | :--- |
| **Admin / HR** | `admin@ems.local` | `AdminPass123!` | Company-wide leave policies, employee setup, quota allocation, audit trail |
| **Manager** | `manager@ems.local` | `ManagerPass123!` | Review team leave applications, approve/reject with remarks, team calendar |
| **Employee (Alex)** | `employee@ems.local` | `EmployeePass123!` | Apply for leave, check balances, view request history, profile editing |
| **Employee (Priya)** | `priya@ems.local` | `EmployeePass123!` | Coworker with isolated requests and balances |

*(Tip: The login page includes one-click buttons to automatically fill in demo credentials).*

---

## 🧪 Testing Scenarios

Run the automated test suite with:
```powershell
cd backend
python manage.py test tests
```

Tests verify:
- ✅ **Role Permissions**: User models and RBAC property isolation.
- ✅ **Duration Calculations**: Automatic exclusion of weekend days (Saturday/Sunday) and official declared holidays.
- ✅ **Overlapping Rejections**: Rejection of overlapping requests on active leaves.
- ✅ **Atomic Balance Deduction**: Safe `select_for_update` row-locking preventing duplicate overspending.
- ✅ **Approval Idempotency**: Rejection of repeated approvals on already processed requests.
- ✅ **Cancellation Reversal**: Restoring deducted days safely upon cancellation of approved leaves.
- ✅ **Data Isolation**: Ensuring employees can only access their own private requests and quotas.

---

## 🛡️ Production & Security Deployment Notes

- Set `DEBUG=False` and configure explicit domain names in `ALLOWED_HOSTS`.
- Provide a secure, randomized `SECRET_KEY` in environment variables.
- HTTPS / SSL redirection, HTTP Strict Transport Security (HSTS), and secure cookie flags (`SESSION_COOKIE_SECURE`, `CSRF_COOKIE_SECURE`) are automatically enforced when `DEBUG=False`.
- Run Django deployment validation check:
  ```powershell
  python manage.py check --deploy
  ```
