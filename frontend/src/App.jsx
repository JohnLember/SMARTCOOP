import { Routes, Route, Navigate } from "react-router";
import ProtectedRoute from "./components/ProtectedRoute";
import Layout from "./components/Layout";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Apply from "./pages/Apply";
import Dashboard from "./pages/Dashboard";
import MembershipApplications from "./pages/MembershipApplications";
import LoanApplications from "./pages/LoanApplications";
import MembersList from "./pages/members/MembersList";
import MemberForm from "./pages/members/MemberForm";
import MemberDetail from "./pages/members/MemberDetail";
import UsersList from "./pages/users/UsersList";
import Barangays from "./pages/Barangays";
import BatchesList from "./pages/production/BatchesList";
import BatchDetail from "./pages/production/BatchDetail";
import LoansList from "./pages/finance/LoansList";
import MemberLoans from "./pages/finance/MemberLoans";
import CreditScoring from "./pages/finance/CreditScoring";
import MemberSelfView from "./pages/MemberSelfView";
import MyDeliveries from "./pages/MyDeliveries";
import MyReceipts from "./pages/MyReceipts";
import MyLoans from "./pages/MyLoans";
import MemberDashboard from "./pages/MemberDashboard";
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
        {/* Dashboard (staff) */}
        <Route path="/dashboard" element={<ProtectedRoute roles={STAFF}><Dashboard /></ProtectedRoute>} />

        {/* Membership (staff) */}
        <Route path="/members" element={<ProtectedRoute roles={STAFF}><MembersList /></ProtectedRoute>} />
        <Route path="/members/new" element={<ProtectedRoute roles={STAFF}><MemberForm /></ProtectedRoute>} />
        <Route path="/members/:id" element={<ProtectedRoute roles={STAFF}><MemberDetail /></ProtectedRoute>} />
        <Route path="/members/:id/edit" element={<ProtectedRoute roles={STAFF}><MemberForm /></ProtectedRoute>} />
        <Route path="/barangays" element={<ProtectedRoute roles={STAFF}><Barangays /></ProtectedRoute>} />

        {/* User management (admin only) */}
        <Route path="/users" element={<ProtectedRoute roles={ADMIN_ONLY}><UsersList /></ProtectedRoute>} />

        {/* Membership applications (staff) */}
        <Route path="/applications" element={<ProtectedRoute roles={STAFF}><MembershipApplications /></ProtectedRoute>} />

        {/* Production (staff) */}
        <Route path="/batches" element={<ProtectedRoute roles={STAFF}><BatchesList /></ProtectedRoute>} />
        <Route path="/batches/:id" element={<ProtectedRoute roles={STAFF}><BatchDetail /></ProtectedRoute>} />

        {/* Finance (staff) */}
        <Route path="/loans" element={<ProtectedRoute roles={STAFF}><LoansList /></ProtectedRoute>} />
        <Route path="/loans/member/:memberId" element={<ProtectedRoute roles={STAFF}><MemberLoans /></ProtectedRoute>} />
        <Route path="/loan-applications" element={<ProtectedRoute roles={STAFF}><LoanApplications /></ProtectedRoute>} />
        <Route path="/credit" element={<ProtectedRoute roles={STAFF}><CreditScoring /></ProtectedRoute>} />

        {/* MAO */}
        <Route path="/mao" element={<ProtectedRoute roles={MAO_ACCESS}><MaoDashboard /></ProtectedRoute>} />
        <Route path="/mao/members-by-barangay" element={<ProtectedRoute roles={MAO_ACCESS}><MembersByBarangay /></ProtectedRoute>} />

        {/* Member self-view */}
        <Route path="/my-dashboard" element={<ProtectedRoute roles={["MEMBER"]}><MemberDashboard /></ProtectedRoute>} />
        <Route path="/me" element={<ProtectedRoute roles={["MEMBER"]}><MemberSelfView /></ProtectedRoute>} />
        <Route path="/my-deliveries" element={<ProtectedRoute roles={["MEMBER"]}><MyDeliveries /></ProtectedRoute>} />
        <Route path="/my-receipts" element={<ProtectedRoute roles={["MEMBER"]}><MyReceipts /></ProtectedRoute>} />
        <Route path="/my-loans" element={<ProtectedRoute roles={["MEMBER"]}><MyLoans /></ProtectedRoute>} />

        {/* Shared */}
        <Route path="/notifications" element={<Notifications />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
