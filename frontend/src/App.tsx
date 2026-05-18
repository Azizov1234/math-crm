import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import MainLayout from '@/layouts/MainLayout';
import AuthLayout from '@/layouts/AuthLayout';
import { useAuthStore } from '@/store/authStore';
import LoadingSkeleton from '@/components/common/LoadingSkeleton';
import { getHomePathByRole } from '@/utils/roleNavigation';

// Lazy pages
const LoginPage = lazy(() => import('@/pages/auth/LoginPage'));
const DashboardPage = lazy(() => import('@/pages/dashboard/DashboardPage'));
const AdminsPage = lazy(() => import('@/pages/admins/AdminsPage'));
const StudentsPage = lazy(() => import('@/pages/students/StudentsPage'));
const TeachersPage = lazy(() => import('@/pages/teachers/TeachersPage'));
const CoursesPage = lazy(() => import('@/pages/courses/CoursesPage'));
const GroupsPage = lazy(() => import('@/pages/groups/GroupsPage'));
const GroupDetailsPage = lazy(() => import('@/pages/groups/GroupDetailsPage'));
const PaymentsPage = lazy(() => import('@/pages/payments/PaymentsPage'));
const DebtorsPage = lazy(() => import('@/pages/debtors/DebtorsPage'));
const MonthlyExamsPage = lazy(() => import('@/pages/monthly-exams/MonthlyExamsPage'));
const ExamResultsPage = lazy(() => import('@/pages/exam-results/ExamResultsPage'));
const SettingsPage = lazy(() => import('@/pages/settings/SettingsPage'));
const SystemLogsPage = lazy(() => import('@/pages/system-logs/SystemLogsPage'));
const ProfilePage = lazy(() => import('@/pages/profile/ProfilePage'));
const ForbiddenPage = lazy(() => import('@/pages/errors/ForbiddenPage'));
const NotFoundPage = lazy(() => import('@/pages/errors/NotFoundPage'));

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore();
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
}

function RequireSuperAdmin({ children }: { children: React.ReactNode }) {
  const { user } = useAuthStore();
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== 'SUPERADMIN') return <Navigate to="/403" replace />;
  return <>{children}</>;
}

function RoleHomeRedirect() {
  const { user, isAuthenticated } = useAuthStore();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <Navigate to={getHomePathByRole(user?.role)} replace />;
}

const SuspenseWrap = ({ children }: { children: React.ReactNode }) => (
  <Suspense fallback={<LoadingSkeleton />}>{children}</Suspense>
);

export default function App() {
  return (
    <BrowserRouter>
      <Toaster position="top-right" richColors closeButton style={{ zIndex: 100 }} />
      <Routes>
        {/* Auth routes */}
        <Route element={<AuthLayout />}>
          <Route path="/login" element={<SuspenseWrap><LoginPage /></SuspenseWrap>} />
        </Route>

        {/* Protected routes */}
        <Route element={<RequireAuth><MainLayout /></RequireAuth>}>
          <Route index element={<RoleHomeRedirect />} />
          <Route path="/dashboard" element={<SuspenseWrap><RequireSuperAdmin><DashboardPage /></RequireSuperAdmin></SuspenseWrap>} />
          <Route path="/admins" element={<SuspenseWrap><RequireSuperAdmin><AdminsPage /></RequireSuperAdmin></SuspenseWrap>} />
          <Route path="/students" element={<SuspenseWrap><RequireSuperAdmin><StudentsPage /></RequireSuperAdmin></SuspenseWrap>} />
          <Route path="/teachers" element={<SuspenseWrap><RequireSuperAdmin><TeachersPage /></RequireSuperAdmin></SuspenseWrap>} />
          <Route path="/courses" element={<SuspenseWrap><RequireSuperAdmin><CoursesPage /></RequireSuperAdmin></SuspenseWrap>} />
          <Route path="/groups" element={<SuspenseWrap><RequireSuperAdmin><GroupsPage /></RequireSuperAdmin></SuspenseWrap>} />
          <Route path="/groups/:id" element={<SuspenseWrap><RequireSuperAdmin><GroupDetailsPage /></RequireSuperAdmin></SuspenseWrap>} />
          <Route path="/payments" element={<SuspenseWrap><RequireSuperAdmin><PaymentsPage /></RequireSuperAdmin></SuspenseWrap>} />
          <Route path="/debtors" element={<SuspenseWrap><RequireSuperAdmin><DebtorsPage /></RequireSuperAdmin></SuspenseWrap>} />
          <Route path="/monthly-exams" element={<SuspenseWrap><MonthlyExamsPage /></SuspenseWrap>} />
          <Route path="/exam-results" element={<SuspenseWrap><ExamResultsPage /></SuspenseWrap>} />
          <Route path="/settings" element={<SuspenseWrap><RequireSuperAdmin><SettingsPage /></RequireSuperAdmin></SuspenseWrap>} />
          <Route path="/system-logs" element={<SuspenseWrap><RequireSuperAdmin><SystemLogsPage /></RequireSuperAdmin></SuspenseWrap>} />
          <Route path="/profile" element={<SuspenseWrap><RequireSuperAdmin><ProfilePage /></RequireSuperAdmin></SuspenseWrap>} />
        </Route>

        {/* Error pages */}
        <Route path="/403" element={<SuspenseWrap><ForbiddenPage /></SuspenseWrap>} />
        <Route path="*" element={<SuspenseWrap><NotFoundPage /></SuspenseWrap>} />
      </Routes>
    </BrowserRouter>
  );
}
