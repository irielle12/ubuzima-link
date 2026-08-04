# Ubuzima-Link

**Offline-First Healthcare Referral Management System**

> BSc. Software Engineering Capstone Project African Leadership University  
> Author: MAHORO Irakoze Irielle  
> Supervisor: Neza David Tuyishimire  Yves Mugenga
> June 2026

---

## Overview

Ubuzima-Link is an offline first referral management system designed to improve communication between health posts and district hospitals in Rwanda. It enables healthcare workers to create, share, and track patient referrals even in low connectivity environments, using local data storage, QR-code based referral sharing, and automatic synchronization when internet connectivity becomes available.

The system addresses a real gap in Rwanda's healthcare system where referrals between health posts and district hospitals still depend heavily on paper-based records that can be lost, delayed, or damaged during patient transfers.

---

## Demo

**5-Minute Demo Video:** `https://drive.google.com/file/d/1HbAGfwmSXFb4ajKIq9rWI3pcvq439BBI/view?usp=sharing`

**Deployed Application:** `https://ubuzima-link-rhew.vercel.app/`

**GitHub Repository:** https://github.com/irielle12/ubuzima-link


---

## Key Features

### Health Post (Tablet UI)
- Patient registration and search
- Offline-first referral creation — works without internet, saves locally via IndexedDB (Dexie.js)
- QR code generation for every referral — shareable via WhatsApp or SMS
- Sync Center — pending offline referrals upload automatically when connectivity returns
- Dashboard with facility-level reports (turnaround time, feedback completion rate)
- Network health alerts (stale sync warnings, last sync attempt status)

### Hospital (Desktop Web UI)
- Referral queue with urgency color-coding (Emergency / Urgent / Routine)
- Side panel referral review with patient info and event timeline
- Patient arrival tracking (Mark as Arrived)
- Close referrals with optional clinical feedback to the health post
- Return referral / counter-referral with follow-up instructions
- Capacity settings — set availability per urgency level, visible to health posts before referring
- QR scan page — scan patient's phone screen to receive offline referrals

### Admin Portal (Desktop Web UI)
- Facility management (add, edit, deactivate health posts and hospitals)
- User account management (create staff accounts, assign facilities and roles)
- Role-based access control (admin / doctor / nurse)

---


## Tech Stack

Frontend  React 19, TypeScript, Vite 
Routing React Router v7 
Offline Storage | Dexie.js (IndexedDB) 
Backend Node.js, Express.js 5 
Database PostgreS
Authentication JWT (jsonwebtoken) 
Password Hashing bcrypt 
QR Generation react-qr-code 
QR Scanning html5-qrcode 
Icons lucide-react 

---

## Prerequisites

Before running locally, make sure you have:

- **Node.js** v18 or higher — https://nodejs.org
- **npm** v9 or higher (comes with Node.js)
- **PostgreSQL** v14 or higher — https://www.postgresql.org/download
- **Git** — https://git-scm.com

Verify your installations:
```bash
node --version
npm --version
psql --version
```

---

## Installation & Setup

### 1. Clone the repository

```bash
git clone https://github.com/irielle12/ubuzima-link
cd ubuzima-link
```

### 2. Set up the PostgreSQL database

Open your PostgreSQL client (psql or pgAdmin) and run:

```sql
CREATE DATABASE ubuzima_link;
```

Then connect to the database and run the schema:

```bash
psql -U postgres -d ubuzima_link -f backend/database/schema.sql
```

### 3. Configure backend environment variables

Navigate to the backend folder and create a `.env` file:

```bash
cd backend
cp .env.example .env
```

If `.env.example` doesn't exist, create `.env` manually with these values:

```env
PORT=5000

DB_HOST=localhost
DB_PORT=5432
DB_NAME=ubuzima_link
DB_USER=postgres
DB_PASSWORD=your_postgres_password

JWT_SECRET=your_secret_key_here
```

Replace `your_postgres_password` with your actual PostgreSQL password. Replace `your_secret_key_here` with any long random string.

### 4. Install backend dependencies and start the server

```bash
cd backend
npm install
npm run dev
```

The backend API will be running at: `http://localhost:5000`

You should see: `Server running on port 5000`

### 5. Install frontend dependencies and start the app

Open a new terminal window:

```bash
cd frontend
npm install
npm run dev
```

The frontend will be running at: `http://localhost:5173`

---

## Creating the First Admin User

The system requires a database-level admin account to get started. Run this SQL directly in your PostgreSQL client, replacing the values as needed:

```sql
INSERT INTO users (
  staff_id,
  first_name,
  last_name,
  email,
  password_hash,
  role,
  facility_id,
  active
)
VALUES (
  'ADMIN001',
  'System',
  'Admin',
  'admin@ubuzimalink.rw',
  '$2b$10$YourHashedPasswordHere',
  'admin',
  NULL,
  true
);
```

> `id` is an auto-incrementing `SERIAL` column — don't supply it yourself, Postgres generates it.

> For the password hash, run this in Node.js to hash your chosen password:
> ```javascript
> const bcrypt = require('bcrypt');
> bcrypt.hash('your_password', 10).then(console.log);
> ```
> Copy the output and paste it as `password_hash` in the SQL above.

Once the admin user exists, log in at `http://localhost:5173/admin` to create facilities and staff accounts through the Admin Portal UI.

> **Admin and doctor logins require a working `RESEND_API_KEY`.** Those two roles complete
> sign-in with an emailed one-time code — without a Resend API key configured in `.env`,
> login for those roles will fail with a server error. `nurse` accounts don't need this;
> they sign in with just Staff ID + password. See [Common Issues](#common-issues) below.

---

## Application Walkthrough

### Core Workflow

1. **Admin** creates a facility (e.g. "Kimironko Health Post") and a user account for the nurse, assigned to that facility
2. **Nurse** logs in on the health post tablet UI
3. Nurse registers a patient (or searches for an existing one)
4. Nurse creates a referral selects diagnosis, urgency, destination hospital
5. If **online**: referral saves to server
6. If **offline**: referral saves to local IndexedDB (Dexie), QR still generates from local data
7. QR is shared to patient no printing needed
8. Patient travels to hospital and shows QR on their phone
9. **Hospital doctor** opens the Scan QR page, scans patient's phone screen
10. If referral is synced: full record loads in the queue
11. If not yet synced: QR data displays as offline referral view
12. Doctor clicks **Mark as Arrived** when patient presents
13. After treatment, doctor **Closes** the referral  optionally adding feedback notes
14. Nurse sees the closed status and any feedback on the health post side

### Offline Sync Flow

1. Nurse creates referrals while offline they appear on the Sync page
2. Each pending referral shows a "View QR" option so the nurse can reshare if needed
3. When connectivity returns, pending referrals sync automatically
4. Sync page shows progress: "Syncing...", "Synced", or individual error messages

---

## Project Structure

```
ubuzima-link/
├── backend/
│   ├── database/
│   │   └── schema.sql          # Full PostgreSQL schema
│   ├── src/
│   │   ├── config/
│   │   │   └── db.js           # PostgreSQL connection pool
│   │   ├── controllers/
│   │   │   ├── adminController.js
│   │   │   ├── authController.js
│   │   │   ├── facilityController.js
│   │   │   ├── patientController.js
│   │   │   ├── referralController.js
│   │   │   └── referralEventController.js
│   │   ├── middleware/
│   │   │   └── authMiddleware.js   # JWT verify + requireAdmin
│   │   ├── routes/
│   │   │   ├── adminRoutes.js
│   │   │   ├── authRoutes.js
│   │   │   ├── facilityRoutes.js
│   │   │   ├── patientRoutes.js
│   │   │   ├── referralEventRoutes.js
│   │   │   └── referralRoutes.js
│   │   └── utils/
│   │       └── hashPassword.js
│   ├── server.js
│   └── package.json
│
└── frontend/
    └── src/
        ├── components/
        │   ├── BottomNav.tsx
        │   ├── ConnectionStatus.tsx
        │   └── RequireAdmin.tsx
        ├── pages/
        │   ├── admin/              # Admin portal (desktop)
        │   │   ├── AdminLayout.tsx
        │   │   ├── FacilitiesList.tsx
        │   │   └── UsersList.tsx
        │   ├── hospital/           # Hospital portal (desktop)
        │   │   ├── HospitalLayout.tsx
        │   │   ├── HospitalQueue.tsx
        │   │   ├── CapacitySettings.tsx
        │   │   └── ReceiveQR.tsx
        │   ├── Dashboard.tsx       # Health post dashboard (tablet)
        │   ├── NewReferral.tsx
        │   ├── PatientSearch.tsx
        │   ├── QRView.tsx
        │   ├── RegisterPatient.tsx
        │   ├── ReferralDetails.tsx
        │   └── Sync.tsx
        └── services/
            ├── adminApi.ts
            ├── authApi.ts
            ├── db.ts               # Dexie IndexedDB setup
            ├── facilityApi.ts
            ├── patientApi.ts
            ├── referralApi.ts
            ├── referralEventApi.ts
            └── syncStatus.ts       # Sync attempt tracking
```

---

## Common Issues

**"Failed to fetch" on any page**
- Make sure the backend server is running on port 5000
- Check the terminal running `npm run dev` in the backend folder for errors
- Verify your `.env` database credentials are correct

**"Database connection failed"**
- Confirm PostgreSQL is running
- Check `DB_PASSWORD` in `.env` matches your PostgreSQL password
- Make sure the `ubuzima_link` database exists (`CREATE DATABASE ubuzima_link;`)

**"Invalid credentials" on login**
- Make sure you created the first admin user via SQL (see above)
- Confirm the password hash was generated correctly using bcrypt

**Server error when logging in as admin or doctor**
- These roles require a two-factor email code to complete sign-in — set `RESEND_API_KEY`
  in `backend/.env` (sign up free at resend.com)
- Without a verified domain in Resend, the free tier only delivers to the email address
  your Resend account itself is registered with — verify a domain to send to any recipient
- `nurse` accounts skip this entirely and are the fastest way to test the app without any
  email setup

**QR scanner not working**
- The browser needs camera permission click "Allow" when prompted
- Must be served over HTTPS or localhost (camera API doesn't work on plain HTTP)
- Try Chrome or Edge  best support for the Web Barcode Detection API

---

## Deployment

The application is deployed at: `https://ubuzima-link-rhew.vercel.app/`

**Frontend** is deployed on Vercel — connected to the GitHub repository, auto-deploys on push to main.

**Backend** is deployed on Render — Node.js web service, environment variables configured in the Render dashboard.

**Database** is hosted on NEON.


---

## Future Work

- Native Background Sync API support, for retrying failed syncs without the app open
- Automated test suite (unit + integration) and CI pipeline
- Integration with Rwanda's national e-Ubuzima health information system

---

## License

This project was developed as a BSc. Software Engineering Capstone at African Leadership University, June 2026.
