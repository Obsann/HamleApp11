# 🏫 Hamle Elementary School Information System

A full-stack **Student Information System (SIS)** built for Hamle Elementary School. The platform enables administrators, teachers, and parents to manage students, track attendance, view academic reports, and communicate through announcements — all from a modern mobile-first interface.

---

## ✨ Features

### 👩‍💼 Admin Portal
- **User Management** — Create, edit, and deactivate admin, teacher, and parent accounts
- **Student Management** — Enroll students with full profiles (Fayda ID, address, medical info, emergency contacts)
- **Dashboard** — Overview of total students, teachers, attendance rates, and recent activity
- **Announcements** — Post school-wide announcements visible to all users
- **Reports Oversight** — View all academic reports across grades and subjects

### 👨‍🏫 Teacher Portal
- **Attendance Tracking** — Record daily attendance (present, late, absent) for assigned students
- **Academic Reports** — Create grade and assessment reports with detailed score breakdowns (mid-exam, tests, continuous assessment, final exam)
- **Student Profiles** — View detailed information for students in assigned classes
- **Announcements** — View school announcements

### 👨‍👩‍👧 Parent Portal
- **Child Overview** — View enrolled children's profiles, grades, and attendance history
- **Academic Reports** — Track academic performance across subjects and terms
- **Announcements** — Stay informed about school news and events

### 🔐 Authentication & Security
- JWT-based authentication with secure session management
- Role-based access control (Admin, Teacher, Parent)
- Password recovery via security questions and recovery email
- SMTP email notifications for password resets
- API rate limiting (100 requests per 15-minute window)
- CORS protection with configurable allowed origins

---

## 🏗️ Architecture

```
HamleApp11/
├── artifacts/
│   ├── backend/          # Express.js REST API
│   │   └── src/
│   │       ├── routes/   # API endpoints
│   │       ├── lib/      # Database connection, seeding, logger
│   │       ├── middlewares/  # Auth middleware
│   │       └── utils/    # Mailer utility
│   ├── frontend/         # Expo React Native app
│   │   ├── app/          # File-based routing (expo-router)
│   │   │   ├── (tabs)/   # Tab navigation screens
│   │   │   └── ...       # Modal & standalone screens
│   │   ├── components/   # Reusable UI components
│   │   ├── context/      # React context providers
│   │   ├── constants/    # Theme, colors, config
│   │   └── hooks/        # Custom React hooks
│   └── mockup-sandbox/   # UI prototyping sandbox
├── lib/
│   ├── api-client-react/ # Type-safe API client with React Query
│   ├── api-spec/         # API specification
│   ├── api-zod/          # Zod validation schemas (shared)
│   └── db/               # Mongoose models & database layer
├── scripts/              # Utility & debugging scripts
└── pnpm-workspace.yaml   # Monorepo workspace config
```

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React Native, Expo SDK 54, Expo Router v6, TypeScript |
| **State Management** | TanStack React Query |
| **Backend** | Node.js, Express 5, TypeScript |
| **Database** | MongoDB with Mongoose ODM |
| **Authentication** | JWT (jsonwebtoken), bcryptjs |
| **Validation** | Zod (shared between client and server) |
| **Email** | Nodemailer (SMTP) |
| **Logging** | Pino + pino-http |
| **Build Tools** | esbuild (backend), Metro (frontend) |
| **Package Manager** | pnpm (monorepo workspaces) |

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** >= 18.x
- **pnpm** >= 8.x
- **MongoDB** (local instance or Atlas connection string)
- **Expo CLI** (installed via the project's devDependencies)

### 1. Clone the Repository

```bash
git clone https://github.com/Obsann/HamleApp11.git
cd HamleApp11
```

### 2. Install Dependencies

```bash
pnpm install
```

### 3. Configure Environment Variables

Copy the example environment file and fill in your values:

```bash
cp .env.example .env
```

| Variable | Description | Default |
|----------|-------------|---------|
| `MONGODB_URI` | MongoDB connection string | `mongodb://localhost:27017/hamle-sis` |
| `PORT` | Backend server port | `5000` |
| `SESSION_SECRET` | JWT signing secret (use a strong random string) | — |
| `ALLOWED_ORIGINS` | Comma-separated CORS origins | `http://localhost:3000,http://localhost:8081` |
| `NODE_ENV` | Environment mode | `development` |
| `LOG_LEVEL` | Logging verbosity | `info` |
| `EXPO_PUBLIC_DOMAIN` | Backend domain for the frontend API client | `localhost:5000` |

### 4. Start the Backend

```bash
cd artifacts/backend
pnpm run dev
```

The backend will:
- Connect to MongoDB
- Automatically seed demo data if the database is empty
- Start listening on the configured port (default: `5000`)

### 5. Start the Frontend

```bash
cd artifacts/frontend
pnpm run dev
```

This launches the Expo development server on port `8081`. You can open the app using:
- **Expo Go** on your phone (scan the QR code)
- **Android Emulator** or **iOS Simulator**
- **Web browser** at `http://localhost:8081`

---

## 🔑 Demo Accounts

The database is automatically seeded with the following accounts on first run:

| Role | Email | Password |
|------|-------|----------|
| Admin | `admin@hamle.edu` | `admin123` |
| Teacher | `teacher@hamle.edu` | `teacher123` |
| Teacher | `teacher2@hamle.edu` | `teacher123` |
| Teacher | `teacher3@hamle.edu` | `teacher123` |
| Parent | `parent@hamle.edu` | `parent123` |

The seed data also includes **12 students** across Grades 2–4, along with academic reports, attendance records, and score breakdowns.

---

## 📡 API Endpoints

All endpoints are prefixed with `/api`.

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/auth/login` | Login with email & password |
| `POST` | `/api/auth/forgot-password` | Initiate password recovery |
| `GET` | `/api/auth/me` | Get current authenticated user |

### Students
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/students` | List all students (filtered by role) |
| `GET` | `/api/students/:id` | Get student details |
| `POST` | `/api/students` | Create a new student |
| `PUT` | `/api/students/:id` | Update student information |
| `DELETE` | `/api/students/:id` | Remove a student |

### Attendance
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/attendance` | List attendance records |
| `POST` | `/api/attendance` | Record attendance |

### Reports
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/reports` | List academic reports |
| `POST` | `/api/reports` | Create a new report |

### Users
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/users` | List all users (admin only) |
| `POST` | `/api/users` | Create a new user |
| `PUT` | `/api/users/:id` | Update user details |
| `DELETE` | `/api/users/:id` | Deactivate a user |

### Announcements
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/announcements` | List announcements |
| `POST` | `/api/announcements` | Create an announcement |

### Dashboard & Health
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/dashboard` | Dashboard statistics |
| `GET` | `/api/health` | Server health check |

---

## 📂 Shared Libraries (`lib/`)

The monorepo shares code between frontend and backend via workspace packages:

| Package | Purpose |
|---------|---------|
| `@workspace/db` | Mongoose models (User, Student, Report, Attendance) |
| `@workspace/api-zod` | Zod schemas for request/response validation |
| `@workspace/api-client-react` | Type-safe API client with React Query hooks |
| `@workspace/api-spec` | API specification and route definitions |

---

## 🧪 Scripts

Utility scripts are located in the `scripts/` directory:

```bash
node scripts/reseed.mjs          # Re-seed the database
node scripts/check-users-security.mjs  # Audit user security settings
node scripts/verify-parents.mjs  # Verify parent-student relationships
node scripts/test-forgot.mjs     # Test forgot-password flow
```

---

## 🏗️ Building for Production

### Type Checking

```bash
# From the root
pnpm run typecheck
```

### Full Build

```bash
pnpm run build
```

This runs type checking followed by building all packages in the workspace.

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
