import { useEffect, useState } from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { authApi } from '@/api/auth.api';
import { settingsApi } from '@/api/settings.api';
import { useAuthStore } from '@/store/authStore';
import { useSettingsStore } from '@/store/settingsStore';
import Sidebar from '@/components/layout/Sidebar';
import Navbar from '@/components/layout/Navbar';
import MobileSidebar from '@/components/layout/MobileSidebar';
import { resolveUploadUrl } from '@/utils/resolveUploadUrl';

export default function MainLayout() {
  const { isAuthenticated, user, login, logout, updateUser } = useAuthStore();
  const { updateSettings } = useSettingsStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [authChecking, setAuthChecking] = useState(true);

  useEffect(() => {
    let active = true;

    const syncCurrentUser = async () => {
      if (!isAuthenticated) {
        if (active) setAuthChecking(false);
        return;
      }

      try {
        const me = await authApi.me();
        updateUser({
          id: me.id,
          username: me.username,
          fullName: me.fullName,
          email: me.email,
          phone: me.phone,
          role: me.role,
          status: me.status,
          lastLoginAt: me.lastLoginAt,
        });
      } catch {
        const stored = localStorage.getItem('crm-auth-v2');
        let refreshToken: string | null = null;
        if (stored) {
          try {
            refreshToken = JSON.parse(stored)?.state?.refreshToken ?? null;
          } catch {
            refreshToken = null;
          }
        }
        if (!refreshToken) return;

        try {
          const refreshed = await authApi.refresh(refreshToken);
          login(
            {
              id: refreshed.user.id,
              username: refreshed.user.username,
              fullName: refreshed.user.fullName,
              email: refreshed.user.email,
              phone: refreshed.user.phone,
              role: refreshed.user.role,
              status: refreshed.user.status,
              lastLoginAt: refreshed.user.lastLoginAt,
            },
            refreshed.accessToken,
            refreshed.refreshToken,
          );
        } catch {
          logout();
        }
      } finally {
        if (active) {
          setAuthChecking(false);
        }
      }
    };

    const fetchSettings = async () => {
      if (!isAuthenticated || user?.role !== 'SUPERADMIN') return;
      try {
        const settings = await settingsApi.getSettings();
        updateSettings({
          academyName: settings.academyName || 'Matematika Academy',
          logoUrl: resolveUploadUrl(settings.logoUrl),
          phone: settings.phone || '',
          address: settings.address || '',
          description: settings.description || '',
        });
      } catch {
        // keep defaults if settings API is unavailable
      }
    };

    syncCurrentUser();
    fetchSettings();
    return () => {
      active = false;
    };
  }, [isAuthenticated, user?.role, login, logout, updateSettings, updateUser]);

  if (authChecking && isAuthenticated) {
    return <div className="min-h-screen bg-slate-50 dark:bg-slate-950" />;
  }

  if (!isAuthenticated) return <Navigate to="/login" replace />;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex">
      {/* Desktop Sidebar */}
      <Sidebar collapsed={collapsed} onCollapse={setCollapsed} />

      {/* Mobile Sidebar */}
      <MobileSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main content */}
      <div className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ${collapsed ? 'md:ml-[72px]' : 'md:ml-64'}`}>
        <Navbar onMenuClick={() => setSidebarOpen(true)} />
        <main className="flex-1 p-4 md:p-6 overflow-x-hidden">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
