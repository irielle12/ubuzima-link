# Ubuzima-Link

## Description

Ubuzima-Link is an offline-first healthcare referral management system designed to improve communication between Health Posts and District Hospitals in Rwanda.

Health workers can create patient referrals even when internet connectivity is unavailable. Referral data is stored locally using IndexedDB and synchronized to a PostgreSQL backend once connectivity is restored. Each referral generates a QR code that receiving hospitals can scan to pull up the referral instantly — including referrals that haven't synced yet, so a walk-in patient can be registered and queued the moment they arrive.

### Key Features

* Offline-first referral creation with local storage (Dexie.js / IndexedDB)
* QR code generation and scanning for referrals
* Hospital "accept from QR" flow — registers and queues a patient from an unsynced referral, then reconciles automatically once the health post syncs
* Role-based login for health workers (nurse / clinician), admins, and hospital staff
* Referral event timeline (audit trail per referral: created, synced, arrived, feedback, etc.)
* Return-referral / feedback loop from hospital back to the referring facility
* Hospital dashboard: work queue, capacity settings, reports
* Admin dashboard: manage facilities and users
* Optional SMS notifications via Africa's Talking, with an `sms:` link fallback when not configured
* English and Kinyarwanda (rw) UI translations
* Online/offline connectivity detection and sync status tracking
* Mobile-first user interface

## GitHub Repository

GitHub Repository Link: https://github.com/irielle12/ubuzima-link

## Technologies Used

### Frontend

* React
* TypeScript
* Vite
* React Router
* Dexie.js (offline storage)
* html5-qrcode (scanning) / react-qr-code, qrcode (generation)
* lucide-react (icons)

### Backend

* Node.js
* Express
* PostgreSQL (`pg`)
* JWT authentication (`jsonwebtoken`, `bcrypt`)
* Africa's Talking SMS (optional)

### Local Storage

* IndexedDB
* Dexie.js

## How to Set Up the Project

### Prerequisites

Install:

* Node.js
* npm
* Git
* PostgreSQL (local install, or a hosted instance such as Neon)

### Clone the Repository

```bash
git clone https://github.com/irielle12/ubuzima-link
```

### Backend Setup

Navigate to backend folder:

```bash
cd backend
```

Install dependencies:

```bash
npm install
```

Create a `.env` file with either a single connection string:

```env
DATABASE_URL=postgresql://user:password@host/dbname?sslmode=require
JWT_SECRET=your_jwt_secret
```

or discrete local Postgres settings:

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=ubuzima_link
DB_USER=postgres
DB_PASSWORD=your_password
JWT_SECRET=your_jwt_secret
```

Optional variables:

```env
PORT=5000
AT_API_KEY=your_africastalking_key
AT_USERNAME=your_africastalking_username
```

Create the database schema by running `backend/database/schema.sql` against your Postgres instance.

Run server (dev, with auto-reload):

```bash
npm run dev
```

Server runs at `http://localhost:5000`.

### Frontend Setup

Navigate to the frontend folder:

```bash
cd frontend
```

Install dependencies:

```bash
npm install
```

Optionally create a `.env` to point at a non-default backend:

```env
VITE_API_URL=http://localhost:5000/api
```

Start development server:

```bash
npm run dev
```

Application runs at:

```text
http://localhost:5173
```

## Designs

### Figma Design

Healthcare Referral System Design:
https://www.figma.com/make/RtGHkRPdWSGCfoWz7ftBaf/Healthcare-Referral-System-Design?p=f&t=6tE6tFtgMlkuKc3I-0

## Logging In

* Health workers (nurse / clinician): `/login`
* Admin: `/login?role=admin`
* Hospital staff: `/hospital/login`

## Workflow

1. Health worker logs in and creates a referral for a patient.
2. Referral is stored locally (IndexedDB) and queued for sync; a QR code is generated for the patient to carry.
3. The receiving hospital scans the QR at `/hospital/receive-qr`:
   * If the referral has already synced, it opens directly in the hospital queue.
   * If it hasn't synced yet, the hospital can accept the patient straight from the QR payload, which creates a stub record and merges with the full referral once the health post syncs.
4. Hospital staff review the referral, mark the patient arrived, and record feedback / outcome.
5. Feedback flows back to the referring facility as a return referral, closing the loop.

## Deployment Plan

### Phase 1 — Offline-first MVP

* Local execution using Vite
* IndexedDB local storage
* QR code generation
* Offline-first workflow

### Phase 2 — Backend & Auth (in progress)

* PostgreSQL backend with JWT-based authentication and role management
* Frontend/backend split with a shared API base URL for deployment
* Hospital portal: queue, capacity settings, reports
* Admin portal: facility and user management
* Deploy frontend (e.g. Vercel) and backend (e.g. Render) with a hosted Postgres instance

### Phase 3

* Integrate national health information systems
* SMS notifications at scale
* Expand reporting and analytics

---

