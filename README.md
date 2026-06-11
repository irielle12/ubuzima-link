# Ubuzima-Link

## Description

Ubuzima-Link is an offline first healthcare referral management system designed to improve communication between Health Posts and District Hospitals in Rwanda.

The system enables healthcare workers to create patient referrals even when internet connectivity is unavailable. Referral data is stored locally using IndexedDB and can later be synchronized when connectivity is restored. Each referral generates a QR code that can be used by receiving hospitals to quickly access referral information.

### Key Features

* Offline-first referral creation
* Local data storage using IndexedDB (Dexie.js)
* QR code generation for referrals
* Referral management dashboard
* Online/offline connectivity detection
* Synchronization workflow simulation
* Mobile-first user interface

## GitHub Repository

GitHub Repository Link: https://github.com/irielle12/ubuzima-link

## Technologies Used

### Frontend

* React
* TypeScript
* Vite
* React Router
* Dexie.js
* React QR Code

### Backend (MVP Structure)

* Node.js
* Express.js

### Local Storage

* IndexedDB
* Dexie.js

## How to Set Up the Project

### Prerequisites

Install:

* Node.js
* npm
* Git

### Clone the Repository

```bash
git clone https://github.com/irielle12/ubuzima-link
```

### Frontend Setup

Navigate to the frontend folder:

```bash
cd frontend
```

Install dependencies:

```bash
npm install
```

Start development server:

```bash
npm run dev
```

Application runs at:

```text
http://localhost:5173
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

Run server:

```bash
node server.js
```

## Designs

### Figma Design

Healthcare Referral System Design:
https://www.figma.com/make/RtGHkRPdWSGCfoWz7ftBaf/Healthcare-Referral-System-Design?p=f&t=6tE6tFtgMlkuKc3I-0
## MVP Workflow

1. Health worker logs in.
2. Health worker creates a referral.
3. Referral is stored locally using IndexedDB.
4. A QR code is generated.
5. Referral appears on the dashboard and referrals page.
6. Synchronization can be initiated when connectivity becomes available.


## Deployment Plan

### Phase 1 (Current MVP)

* Local execution using Vite
* IndexedDB local storage
* QR code generation
* Offline-first workflow

### Phase 2

* Deploy frontend using Vercel
* Deploy backend using Render
* Connect synchronization endpoint to backend database

### Phase 3

* Integrate District Hospital portal
* Add authentication and role management
* Integrate national health information systems

---

