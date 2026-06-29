import {
  BrowserRouter,
  Routes,
  Route
} from "react-router-dom";

import Landing from "./pages/Landing";
import Login from "./pages/login";
import Dashboard from "./pages/Dashboard";
import NewReferral from "./pages/NewReferral";
import QRView from "./pages/QRView";
import Sync from "./pages/Sync";
import Referrals from "./pages/Referrals";
import PatientSearch from "./pages/PatientSearch";
import CreatePatient from "./pages/RegisterPatient";
import ReferralDetails from "./pages/ReferralDetails";
import QueueReview from "./pages/QueueReview";

 import HospitalLogin from "./pages/HospitalLogin";
 import HospitalDashboard from "./pages/HospitalDashboard";
 import ReceiveReferral from "./pages/ReceiveReferral";
 import ReferralPreview from "./pages/ReferralPreview";
function App() {
  return (
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
          path="/patient-search"
          element={<PatientSearch />}
         />
        <Route
          path="/dashboard"
          element={<Dashboard />}
        />
        <Route
  path="/referral-details"
  element={<ReferralDetails />}
/>
        <Route
          path="/new-referral"
          element={<NewReferral />}
        />

        <Route
          path="/qr"
          element={<QRView />}
        />
<Route
  path="/queue-review"
  element={<QueueReview />}
/>
        <Route
          path="/referrals"
          element={<Referrals />}
        />

        <Route
          path="/sync"
          element={<Sync />}
        />
        <Route
  path="/register-patient"
  element={<CreatePatient />}
/>

<Route
  path="/hospital-login"
  element={<HospitalLogin />}
/>

<Route
  path="/hospital-dashboard"
  element={<HospitalDashboard />}
/>
<Route
  path="/receive-referral"
  element={<ReceiveReferral />}
/>
<Route
  path="/referral-preview"
  element={<ReferralPreview />}
/>
      </Routes>
    </BrowserRouter>
  );
}

export default App;