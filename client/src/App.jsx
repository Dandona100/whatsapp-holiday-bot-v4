import { Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Layout from './components/Layout/Layout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import WhatsAppPage from './pages/WhatsAppPage';
import ContactsPage from './pages/ContactsPage';
import GroupsPage from './pages/GroupsPage';
import TemplatesPage from './pages/TemplatesPage';
import SchedulesPage from './pages/SchedulesPage';
import ApprovalsPage from './pages/ApprovalsPage';
import SendNowPage from './pages/SendNowPage';
import ReportsPage from './pages/ReportsPage';
import SettingsPage from './pages/SettingsPage';
import GuidePage from './pages/GuidePage';
import useAuthStore from './store/useAuthStore';

export default function App() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  return (
    <>
      <Toaster position="top-right" />
      <Routes>
        <Route element={<Layout />}>
          <Route path="/guide" element={<GuidePage />} />
          {!isAuthenticated ? (
            <Route path="*" element={<LoginPage />} />
          ) : (
            <>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/whatsapp" element={<WhatsAppPage />} />
              <Route path="/contacts" element={<ContactsPage />} />
              <Route path="/groups" element={<GroupsPage />} />
              <Route path="/templates" element={<TemplatesPage />} />
              <Route path="/schedules" element={<SchedulesPage />} />
              <Route path="/approvals" element={<ApprovalsPage />} />
              <Route path="/send" element={<SendNowPage />} />
              <Route path="/reports" element={<ReportsPage />} />
              <Route path="/settings" element={<SettingsPage />} />
            </>
          )}
        </Route>
      </Routes>
    </>
  );
}
