import {
  BrowserRouter,
  Routes,
  Route
} from "react-router-dom";

import Login from "./pages/login";
import Dashboard from "./pages/Dashboard";
import NewReferral from "./pages/NewReferral";
import QRView from "./pages/QRView";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={<Login />}
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
      </Routes>
    </BrowserRouter>
  );
}

export default App;