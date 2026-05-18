import { Outlet, Navigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { getHomePathByRole } from '@/utils/roleNavigation';

export default function AuthLayout() {
  const { isAuthenticated, user } = useAuthStore();
  if (isAuthenticated) return <Navigate to={getHomePathByRole(user?.role)} replace />;
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 flex">
      <Outlet />
    </div>
  );
}
