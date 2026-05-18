import { NavLink, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { useSettingsStore } from '@/store/settingsStore';
import NameAvatar from '@/components/common/NameAvatar';
import {
  LayoutDashboard, Users, UserCog, GraduationCap, BookOpen,
  Layers, CreditCard, AlertTriangle, CalendarCheck, ClipboardList,
  Settings, ScrollText, ChevronLeft, ChevronRight, ShieldCheck
} from 'lucide-react';

const SUPERADMIN_ITEMS = [
  { name: 'Dashboard',       path: '/dashboard',      icon: LayoutDashboard },
  { name: 'Adminlar',        path: '/admins',         icon: ShieldCheck },
  { name: "O'quvchilar",     path: '/students',       icon: Users },
  { name: "O'qituvchilar",   path: '/teachers',       icon: UserCog },
  { name: 'Kurslar',         path: '/courses',        icon: BookOpen },
  { name: 'Guruhlar',        path: '/groups',         icon: Layers },
  { name: "To'lovlar",       path: '/payments',       icon: CreditCard },
  { name: 'Qarzdorlar',      path: '/debtors',        icon: AlertTriangle },
  { name: 'Oylik Imtihonlar',path: '/monthly-exams',  icon: CalendarCheck },
  { name: 'Imtihon Natijalari',path:'/exam-results',  icon: ClipboardList },
  { name: 'Sozlamalar',      path: '/settings',       icon: Settings },
  { name: 'Tizim Loglari',   path: '/system-logs',    icon: ScrollText },
];

const ADMIN_ITEMS = SUPERADMIN_ITEMS.filter(
  (i) => i.path === '/monthly-exams' || i.path === '/exam-results',
);

interface SidebarProps {
  collapsed: boolean;
  onCollapse: (v: boolean) => void;
}

export default function Sidebar({ collapsed, onCollapse }: SidebarProps) {
  const { user } = useAuthStore();
  const { settings } = useSettingsStore();
  const location = useLocation();
  const items = user?.role === 'SUPERADMIN' ? SUPERADMIN_ITEMS : ADMIN_ITEMS;

  return (
    <aside className={`
      hidden md:flex flex-col fixed top-0 left-0 h-screen z-40
      bg-[#0d1117] text-white shadow-2xl
      transition-all duration-300 ease-in-out
      ${collapsed ? 'w-[72px]' : 'w-64'}
    `}>
      {/* Logo */}
      <div className={`flex items-center h-16 px-4 border-b border-white/8 ${collapsed ? 'justify-center' : 'gap-3'}`}>
        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center flex-shrink-0 shadow-lg shadow-indigo-500/30">
          <GraduationCap className="w-4 h-4 text-white" />
        </div>
        {!collapsed && (
          <span className="text-base font-bold tracking-tight bg-gradient-to-r from-indigo-300 to-violet-300 bg-clip-text text-transparent truncate">
            {settings.academyName}
          </span>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden px-2 py-4 space-y-0.5">
        {!collapsed && (
          <p className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-widest text-slate-600">
            Menyu
          </p>
        )}
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + '/');
          return (
            <NavLink
              key={item.path}
              to={item.path}
              title={collapsed ? item.name : undefined}
              className={`
                flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium
                transition-all duration-200 group relative
                ${isActive
                  ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/25 shadow-sm'
                  : 'text-slate-400 hover:bg-white/5 hover:text-white'}
                ${collapsed ? 'justify-center' : ''}
              `}
            >
              <Icon
                size={18}
                className={`flex-shrink-0 transition-colors ${isActive ? 'text-indigo-400' : 'text-slate-500 group-hover:text-white'}`}
              />
              {!collapsed && <span className="truncate">{item.name}</span>}
              {collapsed && (
                <div className="absolute left-full ml-2 px-2 py-1 bg-slate-800 text-white text-xs rounded-lg
                  opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 shadow-xl
                  transition-opacity duration-150">
                  {item.name}
                </div>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* User + collapse */}
      <div className="border-t border-white/8 p-2 space-y-1">
        {!collapsed && (
          <div className="flex items-center gap-2.5 px-3 py-2">
            <NameAvatar fullName={user?.fullName} className="w-7 h-7 rounded-lg text-xs flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-white truncate">{user?.fullName}</p>
              <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-md ${
                user?.role === 'SUPERADMIN' ? 'bg-violet-500/20 text-violet-300' : 'bg-indigo-500/20 text-indigo-300'
              }`}>
                {user?.role}
              </span>
            </div>
          </div>
        )}
        <button
          onClick={() => onCollapse(!collapsed)}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-slate-500 hover:bg-white/5 hover:text-slate-300 transition-all duration-200"
        >
          {collapsed ? <ChevronRight size={16} /> : <><ChevronLeft size={16} /><span>Yig'ish</span></>}
        </button>
      </div>
    </aside>
  );
}
