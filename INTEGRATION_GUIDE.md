# Backend-Frontend Integration Guide

This document explains how the frontend is now integrated with the backend API.

## Overview

The frontend has been updated to use a comprehensive set of API services that connect to the Express.js backend. All data is now synchronized with the backend, with local Dexie.js database serving as a fallback for offline functionality.

## API Services Created

### 1. **authApi.ts** - Authentication Service
Located in `frontend/src/services/authApi.ts`

Functions:
- `login(staffId, password)` - Authenticates user and stores token
- `logout()` - Clears authentication data
- `getToken()` - Retrieves stored JWT token
- `getUser()` - Retrieves logged-in user info
- `isAuthenticated()` - Checks if user is authenticated

Usage:
```typescript
import { authApi } from "../services/authApi";

// Login
await authApi.login("staffId", "password");

// Get current user
const user = authApi.getUser();

// Logout
authApi.logout();
```

### 2. **patientApi.ts** - Patient Operations
Located in `frontend/src/services/patientApi.ts`

Functions:
- `createPatient(data)` - Register a new patient
- `getAllPatients()` - Fetch all patients
- `searchPatients(query)` - Search patients by name/phone/ID
- `getPatientById(id)` - Get specific patient details
- `getPatientReferrals(patientId)` - Get patient's referral history

Usage:
```typescript
import { patientApi } from "../services/patientApi";

// Create patient
const patient = await patientApi.createPatient({
  fullName: "John Doe",
  gender: "Male",
  dateOfBirth: "1990-01-15",
  phoneNumber: "+250781234567",
  nationalId: "1234567890123456",
});

// Search patients
const results = await patientApi.searchPatients("John");
```

### 3. **referralApi.ts** - Referral Management
Located in `frontend/src/services/referralApi.ts`

Functions:
- `createReferral(data)` - Create new referral
- `getReferrals()` - Fetch all referrals
- `getPendingReferrals()` - Get referrals awaiting hospital review
- `getReferralById(id)` - Get referral details
- `updateReferralStatus(id, status)` - Update referral workflow status
- `getReferralEvents(referralId)` - Get referral event history
- `createReferralEvent(referralId, eventType, description)` - Add event to referral

Usage:
```typescript
import { referralApi } from "../services/referralApi";

// Create referral
const referral = await referralApi.createReferral({
  patientId: 123,
  diagnosis: "Acute respiratory infection",
  urgency: "Urgent",
  destinationFacilityId: 5,
});

// Update status
await referralApi.updateReferralStatus(referral.id, {
  workflowStatus: "Pending Hospital Review",
});
```

### 4. **facilityApi.ts** - Facility/Hospital Operations
Located in `frontend/src/services/facilityApi.ts`

Functions:
- `getAllFacilities()` - Fetch all hospitals/health centers
- `getFacilityById(id)` - Get specific facility details

Usage:
```typescript
import { facilityApi } from "../services/facilityApi";

// Get all facilities
const facilities = await facilityApi.getAllFacilities();
```

## Updated Pages

### Health Worker Pages (Frontend)
1. **login.tsx** - Uses `authApi.login()` for authentication
2. **RegisterPatient.tsx** - Uses `patientApi.createPatient()`
3. **PatientSearch.tsx** - Uses `patientApi.getAllPatients()` and `patientApi.searchPatients()`
4. **NewReferral.tsx** - Uses `referralApi.createReferral()` and `facilityApi.getAllFacilities()`
5. **ReferralDetails.tsx** - Uses `referralApi.updateReferralStatus()`
6. **Dashboard.tsx** - Uses `referralApi.getReferrals()` to load dashboard data
7. **Referrals.tsx** - Uses `referralApi.getReferrals()` for work queue

### Hospital Pages
1. **HospitalLogin.tsx** - Uses `authApi.login()` for authentication
2. **HospitalDashboard.tsx** - Uses `referralApi.getReferrals()` for statistics

## Authentication Flow

1. User logs in with Staff ID and password
2. Backend validates credentials and returns JWT token
3. Token is stored in `localStorage` under key `token`
4. User information is stored in `localStorage` under key `user`
5. All API requests include the token in Authorization header: `Bearer {token}`
6. On logout, both token and user data are cleared

## Error Handling

All API services include:
- Try-catch error handling
- Fallback to local Dexie.js database for offline support
- User-friendly error messages displayed in UI
- Console logging for debugging

Example:
```typescript
try {
  const patients = await patientApi.getAllPatients();
} catch (err) {
  console.error("Error loading patients:", err);
  setError("Failed to load patients from server. Loading from cache...");
  // Fallback to local DB
  const localPatients = await db.patients.toArray();
}
```

## Offline Support

The application maintains offline functionality:
- All API responses are synced to local Dexie.js database
- If backend request fails, app falls back to cached local data
- Status indicator shows "Online" or "Offline"
- Referrals created offline are queued for sync when connection returns

## Backend API Base URL

**Default:** `http://localhost:5000/api`

To change the API endpoint, modify the `BASE_URL` constant in each service file:
```typescript
const BASE_URL = "http://your-api-url/api";
```

## Setting Up Authentication

### For Backend
Ensure your backend has:
1. JWT_SECRET environment variable set
2. User database with fields: `staff_id`, `password_hash`, `first_name`, `last_name`, `role`
3. POST /api/auth/login endpoint

### For Frontend
No additional setup required - just ensure token is provided by backend and follows format:
```json
{
  "token": "eyJhbGc...",
  "user": {
    "id": 1,
    "staffId": "STAFF001",
    "firstName": "John",
    "lastName": "Doe",
    "role": "health_worker"
  }
}
```

## API Request/Response Types

All TypeScript interfaces are defined in the service files for type safety:

### Patient Interface
```typescript
interface Patient {
  id: number;
  patient_number: string;
  first_name: string;
  last_name: string;
  gender: string;
  date_of_birth: string;
  phone: string;
  national_id: string;
  created_at?: string;
}
```

### Referral Interface
```typescript
interface Referral {
  id: number;
  referral_number: string;
  patient_id: number;
  destination_facility_id: number;
  diagnosis: string;
  urgency: string;
  workflow_status: string;
  sync_status: string;
  created_at?: string;
}
```

## Testing the Integration

### 1. Start Backend Server
```bash
cd backend
npm install
npm start
# Server runs on http://localhost:5000
```

### 2. Start Frontend Development Server
```bash
cd frontend
npm install
npm run dev
# Frontend runs on http://localhost:5173
```

### 3. Test Login
- Navigate to Health Worker Login
- Use credentials from your test user in database
- Should redirect to Dashboard on success

### 4. Test Patient Creation
- Click "Register Patient"
- Fill in patient details
- Should sync with backend database

### 5. Test Referral Creation
- Search for a patient
- Create new referral
- Should appear in backend database

## Troubleshooting

### "Login Failed" Error
- Check if backend server is running
- Verify API BASE_URL is correct
- Check if user exists in backend database

### "Failed to load patients" Error
- Backend may be offline
- Check network connection
- App will fall back to local cache if available

### CORS Issues
- Ensure backend has CORS enabled
- Check if frontend URL is in CORS whitelist
- Backend should have: `app.use(cors())`

### Token Expiration
- Tokens expire after 1 day (configurable in backend)
- User will be redirected to login after expiration
- Clear browser localStorage if session issues persist

## Next Steps

1. Implement patient registration page with optional backend user creation
2. Add sync queue management page for offline referrals
3. Implement QR code scanning with backend validation
4. Add referral event tracking with timeline UI
5. Implement hospital feedback system
6. Add role-based access control (RBAC)
