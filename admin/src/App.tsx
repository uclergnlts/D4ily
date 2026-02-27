import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { queryClient } from './api/queryClient';
import { AdminLayout } from './components/layout/AdminLayout';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { ArticlesByCountryPage } from './pages/ArticlesByCountryPage';
import { SourcesByCountryPage } from './pages/SourcesByCountryPage';
import { ManageCountriesPage } from './pages/ManageCountriesPage';
import { UsersPage } from './pages/UsersPage';
import { SettingsPage } from './pages/SettingsPage';
import { DigestsByCountryPage } from './pages/DigestsByCountryPage';
import { TwitterAccountsPage } from './pages/TwitterAccountsPage';
import { CronLogsPage } from './pages/CronLogsPage';
import { NotificationsPage } from './pages/NotificationsPage';
import { SystemHealthPage } from './pages/SystemHealthPage';

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<AdminLayout />}>
            <Route path="/" element={<DashboardPage />} />
            {/* Sources routes */}
            <Route path="/sources" element={<Navigate to="/sources/tr" replace />} />
            <Route path="/sources/manage-countries" element={<ManageCountriesPage />} />
            <Route path="/sources/:countryCode" element={<SourcesByCountryPage />} />
            {/* Articles routes */}
            <Route path="/articles" element={<Navigate to="/articles/tr" replace />} />
            <Route path="/articles/:countryCode" element={<ArticlesByCountryPage />} />
            {/* Digests routes */}
            <Route path="/digests" element={<Navigate to="/digests/tr" replace />} />
            <Route path="/digests/:countryCode" element={<DigestsByCountryPage />} />
            {/* Twitter/X routes */}
            <Route path="/twitter" element={<Navigate to="/twitter/tr" replace />} />
            <Route path="/twitter/:countryCode" element={<TwitterAccountsPage />} />
            {/* Other routes */}
            <Route path="/users" element={<UsersPage />} />
            <Route path="/notifications" element={<NotificationsPage />} />
            <Route path="/cron-logs" element={<CronLogsPage />} />
            <Route path="/system" element={<SystemHealthPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#363636',
            color: '#fff',
          },
        }}
      />
    </QueryClientProvider>
  );
}

export default App;
