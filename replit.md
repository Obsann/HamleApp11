# Hamle Elementary SIS

A mobile Student Information System for Hamle Elementary School — built with Expo (React Native) and an Express/PostgreSQL backend.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL`, `SESSION_SECRET` — Postgres connection string and JWT secret

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Mobile: Expo (React Native) + Expo Router
- API: Express 5 + JWT authentication
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `lib/api-spec/openapi.yaml` — source of truth for all API contracts
- `lib/db/src/schema/` — Drizzle table schemas (users, students, reports, attendance)
- `artifacts/api-server/src/routes/` — Express route handlers
- `artifacts/api-server/src/middlewares/auth.ts` — JWT middleware + role guards
- `artifacts/api-server/src/lib/seed.ts` — seed data (runs once on startup)
- `artifacts/mobile/app/` — Expo Router screens
- `artifacts/mobile/context/AuthContext.tsx` — JWT auth state + AsyncStorage
- `artifacts/mobile/constants/colors.ts` — design tokens (deep blue + gold)

## Architecture decisions

- Contract-first: OpenAPI spec drives codegen for both React Query hooks and Zod validators.
- JWT stored in AsyncStorage; `setAuthTokenGetter` wires it into every API call automatically.
- Role-based access: Admin sees all students; Teacher sees their assigned students; Parent sees only their children.
- Seed runs automatically on first server startup (skipped if users already exist).
- TanStack Query `staleTime: 5min`, `gcTime: 30min` gives offline-friendly caching out of the box.

## Product

- **Login screen** — role-aware login with demo account hints
- **Dashboard** — at-a-glance stats, role-aware quick actions (Admin gets "Manage Users")
- **Students** — searchable list; Admin sees all, Teacher sees assigned class, Parent sees own children only
- **Student detail** — average score, attendance rate, recent reports and attendance in one view
- **Reports** — filterable (grade / assessment / attendance); all roles can view, only Teacher/Admin can add
- **Attendance** — filterable log; all roles can view, only Teacher/Admin can record
- **Add Report** — teacher/admin form to post grades and assessments
- **Record Attendance** — teacher/admin form to log daily attendance
- **Manage Users (Admin only)** — Users tab: list/filter teachers & parents, add new users, edit credentials, delete accounts

## Role privileges

| Feature                  | Admin | Teacher | Parent |
|--------------------------|:-----:|:-------:|:------:|
| View all students        | ✅    | —       | —      |
| View assigned students   | ✅    | ✅      | —      |
| View own children        | ✅    | —       | ✅     |
| Add reports              | ✅    | ✅      | —      |
| Record attendance        | ✅    | ✅      | —      |
| Manage users (CRUD)      | ✅    | —       | —      |

## Demo accounts

| Role    | Email                   | Password     |
|---------|-------------------------|--------------|
| Admin   | admin@hamle.edu         | admin123     |
| Teacher | teacher@hamle.edu       | teacher123   |
| Teacher | teacher2@hamle.edu      | teacher123   |
| Teacher | teacher3@hamle.edu      | teacher123   |
| Parent  | parent@hamle.edu        | parent123    |
| Parent  | parent2@hamle.edu       | parent123    |

Seed data: 12 students across 3 grade levels (Grade 2/3/4), 2 weeks of daily attendance, reports across 5 subjects.

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- Always run `pnpm --filter @workspace/api-spec run codegen` after changing `openapi.yaml`.
- Seed data is inserted only once (skipped if users table is non-empty).
- `SESSION_SECRET` env var is used as the JWT signing key.
- Do NOT run `npx expo start` directly — use `restart_workflow` tool instead.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
