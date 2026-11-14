# Doctor Appointment Booking System

## Project Overview

This project is a full-stack doctor appointment booking application built for a clinic workflow with three roles: patient, doctor, and admin. Patients can browse approved doctors, check availability, create appointment requests, complete simulated payments, and submit reviews after completed visits. Doctors can manage their availability, review appointment requests, and update appointment states. Admins can manage users, specialties, doctor approvals, appointments, and payment actions.

The application uses a Next.js frontend, an Express + TypeScript backend, and MongoDB with Mongoose. Authentication is handled with JWT access tokens, and authorization is enforced by role-based middleware on the server.

## Key Features

- Appointment booking with validation against doctor availability and time conflicts
- Role-based access for admin, doctor, and patient users
- Doctor approval flow and specialty management
- Appointment lifecycle tracking: pending, confirmed, completed, cancelled, and no_show
- Payment record management with simulated payment processing
- Review and rating collection for completed appointments
- Admin dashboard and doctor/patient dashboard summary data
- MongoDB schema and index protection for preventing double-booking of active slots

## Technology Stack

- Frontend: Next.js 14, React 18, TypeScript, Tailwind CSS
- Backend: Node.js, Express 4, TypeScript
- Database: MongoDB Atlas or local MongoDB, Mongoose
- Authentication: JWT (jsonwebtoken), bcrypt for password hashing
- Validation: Zod
- Container support: Docker Compose for local MongoDB

## Project Architecture

The project is split into two main application areas:

- `frontend/`: Next.js app with page routes and feature-based UI modules
- `backend/`: Express API with controllers, services, validators, middleware, and Mongoose models

The backend exposes a REST API under `/api`, and the frontend consumes it through service modules and a shared Axios configuration. The application design is layered as follows:

- Routes
- Middleware (authentication, authorization, validation)
- Controllers
- Services
- Models
- MongoDB data access

## Project Folder Structure

```text
.
├── backend/
│   ├── src/
│   │   ├── app.ts
│   │   ├── server.ts
│   │   ├── config/
│   │   ├── controllers/
│   │   ├── middleware/
│   │   ├── models/
│   │   ├── routes/
│   │   ├── seeds/
│   │   ├── services/
│   │   ├── types/
│   │   ├── utils/
│   │   └── validators/
│   ├── .env.example
│   ├── .env
│   ├── package.json
│   └── tsconfig.json
├── frontend/
│   ├── src/
│   ├── .env.example
│   ├── .env.local
│   ├── package.json
│   ├── tsconfig.json
│   └── next.config.mjs
├── scripts/
│   ├── audit.mjs
│   ├── e2e.mjs
│   ├── setup.mjs
│   └── shape-check.mjs
├── docker-compose.yml
├── .env.example
├── .gitignore
├── package.json
├── README.md
└── .env
```

Note: real environment files are ignored by Git and should not be committed.

## User Roles and Permissions

### Admin

- Manage specialties
- Approve doctors and update doctor records
- View and manage all users
- View all appointments and payments
- Refund payments
- Access admin dashboard metrics

### Doctor

- View and manage their own doctor profile
- Set availability and consultation details
- Review patient appointment requests
- Accept, reject, complete, or mark no-show appointments
- Access doctor dashboard data

### Patient

- Register and log in
- Browse approved doctors and specialties
- Create appointment requests
- View and manage their own appointments
- Pay for appointments using simulated payment flow
- Leave reviews for completed appointments
- Access patient dashboard summary

## Database Design

The application uses MongoDB Atlas or a MongoDB instance through a single Mongoose connection. The actual schema design is implemented in `backend/src/models` and the collections correspond to these documents:

- `users`
  - Stores all accounts: admin, doctor, and patient
  - Fields include `name`, `email`, `passwordHash`, `role`, `phone`, `isActive`, and timestamps
  - Each account has a `role` chosen from `admin`, `doctor`, or `patient`

- `specialties`
  - Stores medical specialties such as cardiology, dermatology, etc.
  - Fields include `name`, `slug`, `description`, `isActive`

- `doctors`
  - One doctor profile per user
  - Related to a `User` and a `Specialty`
  - Fields include `user`, `specialty`, `bio`, `qualifications`, `experienceYears`, `consultationFee`, `slotDurationMinutes`, `availability`, `isApproved`, `ratingAvg`, `ratingCount`

- `appointments`
  - Links a patient to a doctor and a scheduled slot
  - Fields include `patient`, `doctor`, `date`, `startTime`, `endTime`, `status`, `reason`, `notes`, `cancelledBy`
  - A unique partial index prevents double-booking active slots for the same doctor on the same date and start time

- `payments`
  - One payment record per appointment
  - Fields include `appointment`, `patient`, `amount`, `currency`, `method`, `status`, `transactionRef`, `paidAt`
  - Payment states include `pending`, `paid`, `failed`, and `refunded`

- `reviews`
  - One review per appointment
  - Fields include `appointment`, `patient`, `doctor`, `rating`, and `comment`

Relationships are modeled through MongoDB `ObjectId` references between documents, rather than using a separate relational schema.

## Authentication and Authorization

Authentication is based on JWT tokens issued during login. The backend validates the token and reads the current user’s active role from the database before authorizing the request.

Key pieces in the backend:

- `backend/src/middleware/auth.ts`
  - `authenticate`: requires valid Bearer token
  - `optionalAuthenticate`: allows public read endpoints to identify logged-in users when present
  - `authorize(...roles)`: restricts access by role
- `backend/src/routes/auth.routes.ts`
  - `POST /auth/register`
  - `POST /auth/login`
  - `GET /auth/me`

Password hashing is handled with `bcrypt`, and active account checks are enforced on each authenticated request.

## Main API Endpoints

Base API path: `/api`

| Module | Method | Endpoint | Access |
|---|---|---|---|
| Auth | `POST` | `/api/auth/register` | Public |
| Auth | `POST` | `/api/auth/login` | Public |
| Auth | `GET` | `/api/auth/me` | Authenticated |
| Users | `GET` | `/api/users` | Admin |
| Users | `PATCH` | `/api/users/me` | Authenticated user |
| Users | `PATCH` | `/api/users/:id` | Admin |
| Specialties | `GET` | `/api/specialties` | Public/Authenticated |
| Specialties | `POST` | `/api/specialties` | Admin |
| Specialties | `PATCH` | `/api/specialties/:id` | Admin |
| Specialties | `DELETE` | `/api/specialties/:id` | Admin |
| Doctors | `GET` | `/api/doctors` | Public/Authenticated |
| Doctors | `GET` | `/api/doctors/me` | Doctor |
| Doctors | `GET` | `/api/doctors/:id` | Public/Authenticated |
| Doctors | `POST` | `/api/doctors` | Admin |
| Doctors | `PATCH` | `/api/doctors/:id` | Admin/Doctor |
| Doctors | `PATCH` | `/api/doctors/:id/approve` | Admin |
| Doctors | `GET` | `/api/doctors/:id/availability` | Public/Authenticated |
| Doctors | `PUT` | `/api/doctors/:id/availability` | Admin/Doctor |
| Doctors | `GET` | `/api/doctors/:id/slots` | Public |
| Doctors | `GET` | `/api/doctors/:id/reviews` | Public |
| Appointments | `POST` | `/api/appointments` | Patient |
| Appointments | `GET` | `/api/appointments` | Authenticated |
| Appointments | `GET` | `/api/appointments/:id` | Authenticated |
| Appointments | `PATCH` | `/api/appointments/:id/status` | Authenticated |
| Appointments | `PATCH` | `/api/appointments/:id/respond` | Doctor/Admin |
| Payments | `POST` | `/api/payments/:appointmentId/pay` | Patient |
| Payments | `POST` | `/api/payments` | Patient/Admin |
| Payments | `GET` | `/api/payments` | Authenticated |
| Payments | `GET` | `/api/payments/:id` | Authenticated |
| Payments | `PATCH` | `/api/payments/:id/refund` | Admin |
| Payments | `PATCH` | `/api/payments/:id/status` | Admin/Doctor |
| Reviews | `POST` | `/api/reviews` | Patient |
| Reviews | `DELETE` | `/api/reviews/:id` | Admin |
| Dashboards | `GET` | `/api/dashboard/admin` | Admin |
| Dashboards | `GET` | `/api/dashboard/doctor` | Doctor |
| Dashboards | `GET` | `/api/dashboard/patient` | Patient |

The doctor list supports filtering and sorting (`q`, `specialty`, `minFee`, `maxFee`, `minRating`, `minExperience`, `availableOn`, `sort`, `page`, `limit`) as part of the API query parameters.

## Prerequisites

- Node.js 18+
- npm
- MongoDB Atlas account or a local MongoDB instance
- Git
- Docker (optional for local MongoDB startup)

## Installation and Setup

1. Clone the repository.
2. Install dependencies for both app layers:

```bash
npm run install:all
```

3. Create local environment files from the templates if they do not already exist:

```bash
npm run setup
```

4. Update the values in `backend/.env` and `frontend/.env.local` as needed.
5. Start MongoDB locally or connect to your MongoDB Atlas cluster.
6. Seed the database with initial admin and sample data:

```bash
npm run seed
```

## Environment Variables

The project keeps real secrets out of version control. The required environment variables are defined in the example files and should be copied into local `.env` files.

### Backend (`backend/.env`)

```env
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/doctor_appointments
JWT_SECRET=replace-with-a-long-random-string
JWT_EXPIRES_IN=7d
CLIENT_URL=http://localhost:3000
TZ_OFFSET_MINUTES=300
CANCELLATION_WINDOW_HOURS=2
SEED_ADMIN_NAME=System Admin
SEED_ADMIN_EMAIL=admin@clinic.example
SEED_ADMIN_PASSWORD=Admin@12345
SEED_DOCTOR_PASSWORD=Doctor@12345
SEED_SAMPLE_DOCTORS=true
```

The actual `backend/.env` is not committed. `backend/.env.example` shows the template values to follow. For MongoDB Atlas, set `MONGODB_URI` to your Atlas connection string and keep the username/password and cluster host private.

### Frontend (`frontend/.env.local`)

```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api
NEXT_PUBLIC_USE_MOCK=false
```

`NEXT_PUBLIC_USE_MOCK` controls whether the frontend uses the real backend or a browser-based mock data mode. When this is not set to `false`, the frontend will behave as if mock data is enabled.

## Running Frontend and Backend Locally

### Backend

```bash
npm run dev:backend
```

The backend runs on `http://localhost:5000` and exposes the API at `http://localhost:5000/api`.

### Frontend

```bash
npm run dev:frontend
```

The frontend runs on `http://localhost:3000` and calls the API from the configured `NEXT_PUBLIC_API_URL` value.

### Optional MongoDB via Docker

```bash
docker compose up -d
```

This starts MongoDB as defined in the repo’s `docker-compose.yml` file.

## Testing Instructions

The repository includes several scripts for validation and checks:

```bash
npm run typecheck
npm run build
npm run test:e2e
npm run test:audit
npm run test:shapes
```

These scripts are defined at the project root and call the backend/frontend validation tasks or helper scripts under `scripts/`.

## Deployment Information

The application is prepared for a standard Node.js deployment model with a MongoDB backend. For local development, the backend and frontend run as separate processes. For deployment, the project expects:

- A running MongoDB instance or MongoDB Atlas cluster
- A production-safe `JWT_SECRET`
- Correct `CLIENT_URL` / CORS configuration
- Proper backend environment configuration
- A frontend build environment with `NEXT_PUBLIC_API_URL` correctly set

No GitHub Pages, Vercel, or Azure deployment workflow is created as part of this repository. This repo is intended to be used as a source project and is not automatically published to a live URL.

## Current Limitations

- Payment processing is simulated and does not integrate with a real payment gateway
- There is no email verification flow or password reset feature
- No rate limiting, notification system, or audit log is implemented in the current codebase
- Role and permission checks are enforced in the backend but there is no separate multi-tenant or enterprise RBAC layer
- No production-ready CI/CD pipeline is configured in this repository

## Future Improvements

- Integrate a real payment gateway such as Stripe or a regional provider
- Add email verification and password reset workflows
- Add email or SMS notifications for appointment updates
- Add rate limiting and security hardening for public endpoints
- Add additional automated test coverage for API and frontend flows
- Add admin audit logs and improved analytics reporting

