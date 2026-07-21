import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { AppShell } from '../components/layout/AppShell';
import { AssignmentsPage } from '../features/assignments/pages/AssignmentsPage';
import { AuthPage } from '../features/auth/pages/AuthPage';
import { DashboardPage } from '../features/dashboard/pages/DashboardPage';
import { NotificationsPage } from '../features/notifications/pages/NotificationsPage';
import { NewReportPage } from '../features/reports/pages/NewReportPage';
import { DraftsPage } from '../features/reports/pages/DraftsPage';
import { ReportsPage } from '../features/reports/pages/ReportsPage';
import { ReportDetailPage } from '../features/reports/pages/ReportDetailPage';
import { HomePage } from '../pages/HomePage';
import { NotAuthorizedPage } from '../pages/NotAuthorizedPage';
import { NotFoundPage } from '../pages/NotFoundPage';
import { ProtectedRoute } from '../security/ProtectedRoute';

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/connexion" element={<AuthPage mode="login" />} />
        <Route path="/inscription" element={<AuthPage mode="register" />} />
        <Route path="/non-autorise" element={<NotAuthorizedPage />} />

        <Route element={<ProtectedRoute />}>
          <Route element={<AppShell />}>
            <Route path="/tableau-de-bord" element={<DashboardPage />} />
            <Route path="/signalements" element={<ReportsPage />} />
            <Route path="/signalements/:reportId" element={<ReportDetailPage />} />
            <Route path="/signalements/nouveau" element={<NewReportPage />} />
            <Route path="/brouillons" element={<DraftsPage />} />
            <Route path="/notifications" element={<NotificationsPage />} />
            <Route element={<ProtectedRoute roles={['agent', 'manager']} />}>
              <Route path="/affectations" element={<AssignmentsPage />} />
            </Route>
          </Route>
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  );
}
