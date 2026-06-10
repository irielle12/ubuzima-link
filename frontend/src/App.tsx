import {
  BrowserRouter,
  Routes,
  Route
} from "react-router-dom";

import Landing from "./pages/Landing";
import Login from "./pages/login";
import HospitalLogin from "./pages/HospitalLogin";
import Dashboard from "./pages/Dashboard";
import NewReferral from "./pages/NewReferral";
import QRView from "./pages/QRView";
import Sync from "./pages/Sync";
import Referrals from "./pages/Referrals";

function App() {
  return (
    <BrowserRouter>
      <Routes>
         <Route
  path="/referrals"
  element={<Referrals />}
/>
        <Route
          path="/"
          element={<Landing />}
        />

        <Route
          path="/worker-login"
          element={<Login />}
        />

        <Route
          path="/hospital-login"
          element={<HospitalLogin />}
        />

        <Route
          path="/dashboard"
          element={<Dashboard />}
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
          path="/sync"
          element={<Sync />}
        />

      </Routes>
    </BrowserRouter>
  );
}

export default App;