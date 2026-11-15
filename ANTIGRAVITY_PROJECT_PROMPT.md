# Antigravity Code Agent Instructions --- Leave Management System (EMS)

## Your role

Act as a senior full-stack engineer. Build a practical, secure,
maintainable Leave Management System for a startup company. Work
directly in the existing `EMS` workspace. Implement the project in
small, verifiable steps, and explain important decisions briefly.

## Existing workspace --- preserve this structure

The workspace already contains these folders and Django project files:

``` text
EMS/
├── backend/
│   ├── core/
│   │   ├── __init__.py
│   │   ├── asgi.py
│   │   ├── settings.py
│   │   ├── urls.py
│   │   └── wsgi.py
│   └── manage.py
├── frontend/
└── venv/
```

Important: - The Django project has already been created. Do **not** run
`django-admin startproject` again. - The `frontend/` folder already
exists. Inspect it before creating anything. If it is empty, initialize
the frontend inside that folder. - Use the existing
`backend/core/settings.py`, `backend/core/urls.py`, and
`backend/manage.py`. Update them carefully instead of replacing them
blindly. - Do not modify, delete, or recreate `venv/`. - Do not
overwrite existing user code without inspecting it first. - Run commands
from the correct directory and use the existing virtual environment when
possible. - Before adding dependencies, inspect the installed packages
and current project configuration.

## Product goal

Build an internal HR Leave Management System for a small startup.
Prioritize a working, understandable MVP over excessive features or
infrastructure.

### User roles

1.  **Admin / HR**
    -   Manage employees, departments, leave types, holiday calendar,
        leave policies, and balances.
    -   View and filter leave requests.
    -   View reports and audit history.
2.  **Manager**
    -   View requests from assigned team members.
    -   Approve or reject assigned requests with comments.
    -   View the team's leave calendar.
3.  **Employee**
    -   View and update permitted profile fields.
    -   View own leave balances and request history.
    -   Submit leave requests and cancel eligible requests.
    -   View notifications and assigned tasks if the task module is
        implemented.

Enforce permissions on the backend. Hiding a button in the frontend is
not authorization.

## Technology choices

### Backend

-   Python and the existing Django project.
-   Django REST Framework for REST APIs.
-   PostgreSQL for production and development when available.
-   Django's custom user model with email-based login. Configure
    `AUTH_USER_MODEL` before the first project migration.
-   `djangorestframework-simplejwt` for JWT authentication if using a
    separate React frontend.
-   `django-filter` for list filtering.
-   `django-cors-headers` only if frontend and backend use different
    origins; configure an explicit allowed-origin list.
-   Use Django's built-in password hashing, validation, migrations, and
    admin.
-   Do not add Celery, Redis, WebSockets, microservices, or other
    infrastructure for the MVP unless there is a demonstrated need.

### Frontend

-   React + TypeScript, initialized inside the existing `frontend/`
    directory if it is empty.
-   Use Vite for the frontend build setup.
-   Use React Router for navigation.
-   Use TanStack Query for API state where helpful.
-   Use React Hook Form and Zod for forms and validation where helpful.
-   Use Bootstrap or Tailwind CSS; choose one and keep styling
    consistent. Prefer a clean, responsive, accessible interface.
-   Create a reusable API client and a centralized place for API
    configuration.
-   Never put secrets or private backend credentials in frontend
    environment variables.

### Database

Use PostgreSQL. Keep the application compatible with Django ORM. If
PostgreSQL is not yet available locally, use the simplest temporary
development setup and document how to switch; do not silently claim
SQLite is production-ready for concurrent leave approvals.

## Suggested repository structure

Adapt this to the actual workspace after inspecting it. Do not create
duplicate project roots.

``` text
EMS/
├── backend/
│   ├── manage.py
│   ├── core/
│   │   ├── settings.py
│   │   ├── urls.py
│   │   ├── asgi.py
│   │   └── wsgi.py
│   ├── apps/
│   │   ├── accounts/
│   │   ├── organization/
│   │   ├── leave/
│   │   ├── approvals/
│   │   ├── notifications/
│   │   ├── tasks/              # optional MVP module
│   │   └── reports/
│   ├── requirements.txt
│   ├── .env.example
│   └── tests/
├── frontend/
│   ├── package.json
│   ├── src/
│   │   ├── api/
│   │   ├── components/
│   │   ├── features/
│   │   ├── layouts/
│   │   ├── pages/
│   │   ├── routes/
│   │   ├── types/
│   │   └── main.tsx
│   └── .env.example
├── .gitignore
└── README.md
```

## Core data model requirements

Design clear relationships, sensible constraints, and useful indexes.
Use `created_at` and `updated_at` where appropriate.

-   **User**: email, password, role, is_active. Use Django's supported
    custom-user patterns; never store plain-text passwords.
-   **Department**: name and description.
-   **EmployeeProfile**: one-to-one user, unique employee code,
    department, optional manager, joining date.
-   **LeaveType**: name, description, annual allowance, approval
    requirement, active flag.
-   **LeaveBalance**: employee, leave type, year, allocated days, used
    days. Add a unique constraint for employee + leave type + year.
-   **Holiday**: date and name.
-   **LeaveRequest**: employee, leave type, start date, end date,
    reason, status, computed duration, submitted timestamp, optional
    cancellation details.
-   **ApprovalHistory**: leave request, approver, action, comment,
    timestamp. Keep a history of every decision.
-   **Notification**: recipient, message, read timestamp, created
    timestamp.
-   **AuditLog**: actor, action, affected object information, timestamp.
    Avoid logging passwords, tokens, or sensitive secrets.
-   **Task**: optional; title, description, assigned user, creator, due
    date, status, timestamps.

Choose explicit status values such as `PENDING`, `APPROVED`, `REJECTED`,
and `CANCELLED`. Validate all state changes on the backend. Do not allow
clients to set arbitrary approval states through a general update
endpoint.

## Leave business rules

Implement and test these rules: - Start date must not be after end
date. - Reject invalid or past dates according to a clearly documented
policy. - Calculate leave duration on the server, not by trusting a
frontend-submitted number. - Make weekend, holiday, half-day,
unpaid-leave, carry-forward, and negative-balance rules explicit and
configurable where reasonable. For the MVP, document the chosen default
behavior. - Check overlapping requests. - Employees can access only
their own requests and balances unless their role permits more. -
Managers can approve/reject only requests they are authorized to
manage. - Only pending requests can be approved or rejected. - Record
approver, decision, comment, and timestamp in `ApprovalHistory`. - Use
`transaction.atomic()` and appropriate database row locking when
approval changes a balance, so simultaneous approvals cannot overspend
the same balance. - Make approval idempotent: a repeated request must
not deduct leave twice. - Define cancellation behavior for pending
versus approved leave and reverse balance changes safely when
appropriate. - Use clear validation errors and suitable HTTP status
codes. - Do not hard-code one manager or one company into the logic.

Do not implement complicated multi-level approvals unless the basic
workflow works and is tested.

## API requirements

Use `/api/v1/` as the API prefix. Use DRF serializers, views/viewsets,
permissions, and routers consistently.

Implement endpoints equivalent to: - `POST /api/v1/auth/login/` -
`POST /api/v1/auth/refresh/` when using JWT -
`GET /api/v1/employees/me/` - HR-authorized employee list/create/update
endpoints - `GET /api/v1/leave/types/` - `GET /api/v1/leave/balance/` -
`GET, POST /api/v1/leave/requests/` -
`GET /api/v1/leave/requests/{id}/` -
`POST /api/v1/leave/requests/{id}/approve/` -
`POST /api/v1/leave/requests/{id}/reject/` -
`POST /api/v1/leave/requests/{id}/cancel/` -
`GET /api/v1/leave/calendar/` - `GET /api/v1/notifications/` -
`POST /api/v1/notifications/{id}/read/` - Task CRUD endpoints if the
optional task module is implemented - HR/manager-authorized leave
summary report endpoint

Filter and paginate list endpoints. Avoid N+1 queries using
`select_related()` and `prefetch_related()` where appropriate. Return
consistent error responses without exposing stack traces or internal
details.

## Frontend screens

Build a cohesive, responsive UI with accessible labels, loading
indicators, empty states, form validation, error feedback, and
confirmation for consequential actions.

Required screens: 1. Login. 2. Role-aware dashboard. 3. Employee
profile. 4. Leave balance summary. 5. Apply for leave form with date
selection, leave type, reason, and calculated duration preview. 6. My
leave requests/history with status filters. 7. Manager approval inbox
with request details, approve/reject actions, and comments. 8.
Team/company leave calendar based on permissions. 9. HR employee and
leave-type management. 10. Notifications. 11. Basic leave summary/report
screen for authorized roles.

The employee should not see HR-only navigation. A manager should see
only the team features they are authorized to use. Handle API `401`,
`403`, validation errors, and expired sessions gracefully.

Keep task management secondary to the core leave workflow. If time is
limited, finish the leave MVP first and document tasks as a later phase.

## Security requirements

-   Use environment variables for secrets and database credentials.
-   Add `.env.example` with placeholder values only; never commit a real
    `.env`.
-   Set `DEBUG=False` in production and configure `ALLOWED_HOSTS`.
-   Require HTTPS in production.
-   Configure CORS for only the intended frontend origins.
-   Apply CSRF protection when using cookie-based authentication.
-   If using JWT, use short-lived access tokens and a safe refresh-token
    strategy. Do not put long-lived secrets in local storage.
-   Apply authentication, role checks, and object-level permissions to
    every protected endpoint.
-   Validate input on the backend.
-   Prevent mass assignment of role, balance, and approval fields.
-   Use database constraints in addition to application validation.
-   Do not expose secrets, passwords, or sensitive employee details in
    logs or error responses.
-   Configure backups and document a restore procedure.
-   Run Django deployment checks before production release.

## Testing requirements

Write automated tests for: - User model and role permissions. - Employee
access isolation. - Manager access to assigned team requests only. -
Leave duration and date validation. - Overlapping requests. - Approval
and rejection state transitions. - Balance updates and cancellation
reversals. - Duplicate approval requests and concurrent approval
protection where practical. - API authentication, filtering, pagination,
and validation errors. - Frontend critical flows and form errors where
practical.

Do not claim tests pass unless you actually run them and inspect the
results.

## Development workflow --- follow this order

1.  Inspect the entire existing workspace and current settings before
    making changes.
2.  Summarize what already exists and identify any missing
    prerequisites.
3.  Create or update `.gitignore`, environment examples, and dependency
    files without overwriting existing work.
4.  Configure backend settings and install only the required
    dependencies.
5.  Create the custom user model and organization models. Configure
    `AUTH_USER_MODEL` before generating the first migration.
6.  Implement leave models, constraints, business logic, serializers,
    permissions, API views, and routes.
7.  Create and run migrations; verify database configuration.
8.  Add backend tests and run them.
9.  Inspect `frontend/`; initialize React + TypeScript + Vite there only
    if needed.
10. Build the API client, authentication flow, routing, shared layout,
    and role-aware screens.
11. Connect the frontend to the backend and test the complete
    employee-to-manager approval flow.
12. Add basic notifications and reports; implement tasks only after the
    leave workflow is stable.
13. Run the available tests, lint/build checks, and Django deployment
    checks. Fix failures instead of ignoring them.
14. Update `README.md` with setup commands, environment variables,
    migration steps, test commands, demo-user creation instructions, and
    deployment notes.

At each phase: - State which files you plan to add or change. - Make
focused changes and preserve existing user work. - Run relevant commands
and report actual results. - If a command fails, diagnose and fix the
cause rather than pretending it succeeded. - Ask before destructive
changes or before changing major technology choices. - Do not leave core
features as fake buttons, hard-coded demo data, or unimplemented TODOs
while claiming the system is complete.

## Completion criteria

The MVP is complete only when: - A user can log in and see the correct
role-aware dashboard. - An employee can submit a leave request and view
its status. - An authorized manager can approve/reject it and provide a
comment. - Leave balance updates correctly and cannot be deducted
twice. - Employees cannot access other employees' private records. - HR
can manage core employee and leave configuration data. - API and
frontend validation work. - Backend tests pass, and the frontend
production build succeeds. - Setup and deployment steps are documented.

## First action

Start by inspecting the current `EMS` workspace, including the existing
Django settings, URL configuration, installed dependencies, and contents
of `frontend/`. Then propose a short implementation plan based on what
is actually present. Do not regenerate the Django project. Proceed
incrementally from the existing files.
