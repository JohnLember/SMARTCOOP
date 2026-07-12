import { Routes, Route, Navigate } from "react-router";
import ProtectedRoute from "./components/ProtectedRoute";
import Layout from "./components/Layout";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Apply from "./pages/Apply";
import Applications from "./pages/Applications";
import MembersList from "./pages/members/MembersList";
import MemberForm from "./pages/members/MemberForm";
import MemberDetail from "./pages/members/MemberDetail";
import UsersList from "./pages/users/UsersList";
import Barangays from "./pages/Barangays";
import BatchesList from "./pages/production/BatchesList";
import BatchDetail from "./pages/production/BatchDetail";
import LoansList from "./pages/finance/LoansList";
import LoanDetail from "./pages/finance/LoanDetail";
import CreditScoring from "./pages/finance/CreditScoring";
import MemberSelfView from "./pages/MemberSelfView";
import MyDeliveries from "./pages/MyDeliveries";
import MyReceipts from "./pages/MyReceipts";
import Notifications from "./pages/Notifications";
import MaoDashboard from "./pages/mao/MaoDashboard";
import MembersByBarangay from "./pages/mao/MembersByBarangay";

const STAFF = ["ADMIN", "STAFF"];
const ADMIN_ONLY = ["ADMIN"];
const MAO_ACCESS = ["MAO"];

function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/apply" element={<Apply />} />

      <Route
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        {/* Membership (staff) */}
        <Route path="/members" element={<ProtectedRoute roles={STAFF}><MembersList /></ProtectedRoute>} />
        <Route path="/members/new" element={<ProtectedRoute roles={STAFF}><MemberForm /></ProtectedRoute>} />
        <Route path="/members/:id" element={<ProtectedRoute roles={STAFF}><MemberDetail /></ProtectedRoute>} />
        <Route path="/members/:id/edit" element={<ProtectedRoute roles={STAFF}><MemberForm /></ProtectedRoute>} />
        <Route path="/barangays" element={<ProtectedRoute roles={STAFF}><Barangays /></ProtectedRoute>} />

        {/* User management (admin only) */}
        <Route path="/users" element={<ProtectedRoute roles={ADMIN_ONLY}><UsersList /></ProtectedRoute>} />

        {/* Membership applications (staff) */}
        <Route path="/applications" element={<ProtectedRoute roles={STAFF}><Applications /></ProtectedRoute>} />

        {/* Production (staff) */}
        <Route path="/batches" element={<ProtectedRoute roles={STAFF}><BatchesList /></ProtectedRoute>} />
        <Route path="/batches/:id" element={<ProtectedRoute roles={STAFF}><BatchDetail /></ProtectedRoute>} />

        {/* Finance (staff) */}
        <Route path="/loans" element={<ProtectedRoute roles={STAFF}><LoansList /></ProtectedRoute>} />
        <Route path="/loans/:id" element={<ProtectedRoute roles={STAFF}><LoanDetail /></ProtectedRoute>} />
        <Route path="/credit" element={<ProtectedRoute roles={STAFF}><CreditScoring /></ProtectedRoute>} />

        {/* MAO */}
        <Route path="/mao" element={<ProtectedRoute roles={MAO_ACCESS}><MaoDashboard /></ProtectedRoute>} />
        <Route path="/mao/members-by-barangay" element={<ProtectedRoute roles={MAO_ACCESS}><MembersByBarangay /></ProtectedRoute>} />

        {/* Member self-view */}
        <Route path="/me" element={<ProtectedRoute roles={["MEMBER"]}><MemberSelfView /></ProtectedRoute>} />
        <Route path="/my-deliveries" element={<ProtectedRoute roles={["MEMBER"]}><MyDeliveries /></ProtectedRoute>} />
        <Route path="/my-receipts" element={<ProtectedRoute roles={["MEMBER"]}><MyReceipts /></ProtectedRoute>} />

        {/* Shared */}
        <Route path="/notifications" element={<Notifications />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
