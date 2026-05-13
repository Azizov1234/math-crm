import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { X, GraduationCap, LayoutDashboard, Users, UserCog, BookOpen, Layers, CreditCard, AlertTriangle, CalendarCheck, ClipboardList, Settings, ScrollText, ShieldCheck, LogOut } from 'lucide-react';
import { authApi } from '@/api/auth.api';
import { useAuthStore } from '@/store/authStore';
import { useSettingsStore } from '@/store/settingsStore';
import NameAvatar from '@/components/common/NameAvatar';

const SUPERADMIN_ITEMS = [
  { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
  { name: 'Adminlar', path: '/admins', icon: ShieldCheck },
  { name: "O'quvchilar", path: '/students', icon: Users },
  { name: "O'qituvchilar", path: '/teachers', icon: UserCog },
  { name: 'Kurslar', path: '/courses', icon: BookOpen },
  { name: 'Guruhlar', path: '/groups', icon: Layers },
  { name: "To'lovlar", path: '/payments', icon: CreditCard },
  { name: 'Qarzdorlar', path: '/debtors', icon: AlertTriangle },
  { name: 'Oylik Imtihonlar', path: '/monthly-exams', icon: CalendarCheck },
  { name: 'Imtihon Natijalari', path: '/exam-results', icon: ClipboardList },
  { name: 'Sozlamalar', path: '/settings', icon: Settings },
  { name: 'Tizim Loglari', path: '/system-logs', icon: ScrollText },
];
const ADMIN_ITEMS = SUPERADMIN_ITEMS.filter(i => i.path !== '/admins' && i.path !== '/system-logs');

interface Props { open: boolean; onClose: () => void; }

export default function MobileSidebar({ open, onClose }: Props) {
  const { user, logout } = useAuthStore();
  const { settings } = useSettingsStore();
  const location = useLocation();
  const navigate = useNavigate();
  const items = user?.role === 'SUPERADMIN' ? SUPERADMIN_ITEMS : ADMIN_ITEMS;

  const handleLogout = async () => {
    try {
      await authApi.logout();
    } catch {
      // ignore logout network errors
    }
    logout();
    onClose();
    navigate('/login', { replace: true });
  };

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 md:hidden" onClick={onClose} />
      )}

      {/* Drawer */}
      <div className={`
        fixed top-0 left-0 h-screen w-[280px] bg-[#0d1117] text-white z-50 flex flex-col
        shadow-2xl transition-transform duration-300 ease-out md:hidden
        ${open ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex items-center justify-between px-5 h-16 border-b border-white/8">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg">
              <GraduationCap className="w-4 h-4 text-white" />
            </div>
            <span className="text-base font-bold bg-gradient-to-r from-indigo-300 to-violet-300 bg-clip-text text-transparent">
              {settings.academyName}
            </span>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition">
            <X size={18} />
          </button>
        </div>

        <div className="px-4 py-3 border-b border-white/8">
          <div className="flex items-center gap-3">
            <NameAvatar fullName={user?.fullName} className="w-9 h-9 text-sm" />
            <div>
              <p className="text-sm font-semibold text-white">{user?.fullName}</p>
              <span className={`text-xs px-1.5 py-0.5 rounded-md font-medium ${
                user?.role === 'SUPERADMIN' ? 'bg-violet-500/20 text-violet-300' : 'bg-indigo-500/20 text-indigo-300'
              }`}>{user?.role}</span>
            </div>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
          {items.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + '/');
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={onClose}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                  isActive ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/25' : 'text-slate-400 hover:bg-white/5 hover:text-white'
                }`}
              >
                <Icon size={18} className={isActive ? 'text-indigo-400' : 'text-slate-500'} />
                <span>{item.name}</span>
              </NavLink>
            );
          })}
        </nav>

        <div className="p-3 border-t border-white/8">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:bg-rose-500/15 hover:text-rose-400 transition-all"
          >
            <LogOut size={16} />
            Chiqish
          </button>
        </div>
      </div>
    </>
  );
}
