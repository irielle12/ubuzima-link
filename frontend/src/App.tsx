import { useEffect } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate
} from "react-router-dom";
import { LanguageProvider } from "./contexts/LanguageContext";
import { NotificationProvider } from "./contexts/NotificationContext";
import { initSessionRefresh } from "./services/authApi";

import Landing from "./pages/Landing";
import Login from "./pages/login";
import ForcePasswordChange from "./pages/ForcePasswordChange";
import Dashboard from "./pages/Dashboard";
import NewReferral from "./pages/NewReferral";
import QRView from "./pages/QRView";
import Sync from "./pages/Sync";
import Referrals from "./pages/Referrals";
import PatientSearch from "./pages/PatientSearch";
import CreatePatient from "./pages/RegisterPatient";
import EditPatient from "./pages/EditPatient";
import EditReferral from "./pages/EditReferral";
import ReferralDetails from "./pages/ReferralDetails";
import WorkQueueList from "./pages/WorkQueueList";
import Profile from "./pages/Profile";

 import HospitalLogin from "./pages/HospitalLogin";
 import ReceiveReferral from "./pages/ReceiveReferral";
 import ReferralPreview from "./pages/ReferralPreview";
import PatientProfile from "./pages/PatientProfile";

import RequireNurse from "./components/RequireNurse";
import RequireAdmin from "./components/RequireAdmin";
import AdminLayout from "./pages/admin/AdminLayout";
import FacilitiesList from "./pages/admin/FacilitiesList";
import UsersList from "./pages/admin/UsersList";

import RequireHospital from "./components/RequireHospital";
import HospitalLayout from "./pages/hospital/HospitalLayout";
import HospitalQueue from "./pages/hospital/HospitalQueue";
import HospitalReports from "./pages/hospital/HospitalReports";
import ReceiveQR from "./pages/hospital/ReceiveQR";
import CapacitySettings from "./pages/hospital/CapacitySettings";

function App() {
  useEffect(() => {
    initSessionRefresh();
  }, []);

  return (
    <LanguageProvider>
    <NotificationProvider>
    <BrowserRouter>
      <Routes>

        <Route
          path="/"
          element={<Landing />}
        />
        <Route
          path="/login"
          element={<Login />}
        />
        <Route
          path="/force-password-change"
          element={<ForcePasswordChange />}
        />
        {/* Health worker routes — nurse role required */}
        <Route element={<RequireNurse />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/patient-search" element={<PatientSearch />} />
          <Route path="/patient-profile/:id" element={<PatientProfile />} />
          <Route path="/edit-patient/:id" element={<EditPatient />} />
          <Route path="/referral-details/:id" element={<ReferralDetails />} />
          <Route path="/edit-referral/:id" element={<EditReferral />} />
          <Route path="/new-referral" element={<NewReferral />} />
          <Route path="/qr-view" element={<QRView />} />
          <Route path="/referrals" element={<Referrals />} />
          <Route path="/work-queue/:status" element={<WorkQueueList />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/sync" element={<Sync />} />
          <Route path="/register-patient" element={<CreatePatient />} />
        </Route>

{/* Hospital desktop portal */}
<Route path="/hospital/login" element={<HospitalLogin />} />
<Route
  path="/hospital"
  element={
    <RequireHospital>
      <HospitalLayout />
    </RequireHospital>
  }
>
  <Route index element={<Navigate to="queue" replace />} />
  <Route path="queue" element={<HospitalQueue scope="active" />} />
  <Route path="closed" element={<HospitalQueue scope="closed" />} />
  <Route path="receive-qr" element={<ReceiveQR />} />
  <Route path="reports" element={<HospitalReports />} />
  <Route path="capacity" element={<CapacitySettings />} />
</Route>

{/* Legacy redirects — keep old routes working */}
<Route path="/hospital-login" element={<Navigate to="/hospital/login" replace />} />
<Route path="/hospital-dashboard" element={<Navigate to="/hospital/queue" replace />} />
<Route path="/queue-review" element={<Navigate to="/hospital/queue" replace />} />
<Route path="/hospital-referral/:id" element={<Navigate to="/hospital/queue" replace />} />

<Route path="/receive-referral" element={<ReceiveReferral />} />
<Route path="/referral-preview" element={<ReferralPreview />} />

<Route
  path="/admin"
  element={
    <RequireAdmin>
      <AdminLayout />
    </RequireAdmin>
  }
>
  <Route
    index
    element={<Navigate to="facilities" replace />}
  />
  <Route
    path="facilities"
    element={<FacilitiesList />}
  />
  <Route
    path="users"
    element={<UsersList />}
  />
</Route>
      </Routes>
    </BrowserRouter>
    </NotificationProvider>
    </LanguageProvider>
  );
}

export default App;