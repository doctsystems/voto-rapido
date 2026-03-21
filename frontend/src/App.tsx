import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/auth.store';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import UsersPage from './pages/UsersPage';
import PartiesPage from './pages/PartiesPage';
import SchoolsPage from './pages/SchoolsPage';
import TablesPage from './pages/TablesPage';
import ElectionTypesPage from './pages/ElectionTypesPage';
import ReportsPage from './pages/ReportsPage';
import NewReportPage from './pages/NewReportPage';
import PrivacyPolicyPage from './pages/PrivacyPolicyPage';
import ChangePasswordPage from './pages/ChangePasswordPage';
import Layout from './components/Layout';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user } = useAuthStore();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (user?.mustChangePassword) return <Navigate to="/change-password" replace />;
  return <>{children}</>;
}

export default function App() {
  const { isAuthenticated, user } = useAuthStore();

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/login"
          element={
            isAuthenticated
              ? <Navigate to={user?.mustChangePassword ? "/change-password" : "/"} replace />
              : <LoginPage />
          }
        />
        <Route
          path="/change-password"
          element={
            !isAuthenticated
              ? <Navigate to="/login" replace />
              : user?.mustChangePassword
                ? <ChangePasswordPage />
                : <Navigate to="/" replace />
          }
        />
        <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
        <Route path="/" element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }>
          <Route index element={<DashboardPage />} />
          <Route path="users" element={<UsersPage />} />
          <Route path="parties" element={<PartiesPage />} />
          <Route path="schools" element={<SchoolsPage />} />
          <Route path="tables" element={<TablesPage />} />
          <Route path="election-types" element={<ElectionTypesPage />} />
          <Route path="reports" element={<ReportsPage />} />
          <Route path="reports/new" element={<NewReportPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
