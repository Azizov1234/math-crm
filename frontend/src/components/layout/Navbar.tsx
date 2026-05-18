import { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Menu, ChevronRight, LogOut, User, Settings, ChevronDown, Moon, Sun } from 'lucide-react';
import { authApi } from '@/api/auth.api';
import { useAuthStore } from '@/store/authStore';
import { useSettingsStore } from '@/store/settingsStore';
import NameAvatar from '@/components/common/NameAvatar';

interface NavbarProps { onMenuClick: () => void; }
const THEME_STORAGE_KEY = 'crm-theme';
type ThemeMode = 'light' | 'dark';

export default function Navbar({ onMenuClick }: NavbarProps) {
  const { user, logout } = useAuthStore();
  const { settings } = useSettingsStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => {
    if (typeof window === 'undefined') return 'light';
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === 'dark' || stored === 'light') return stored;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', themeMode === 'dark');
    localStorage.setItem(THEME_STORAGE_KEY, themeMode);
  }, [themeMode]);

  const pageName = location.pathname.replace('/', '').split('/')[0].replace(/-/g, ' ') || 'Dashboard';

  const handleLogout = async () => {
    try {
      await authApi.logout();
    } catch {
      // ignore network errors during logout
    }
    logout();
    navigate('/login');
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200/80 bg-white/95 px-4 shadow-sm backdrop-blur-sm dark:border-slate-800 dark:bg-slate-950/90 md:px-6">
      {/* Left */}
      <div className="flex items-center gap-3">
        <button
          className="rounded-xl p-2 text-slate-500 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 md:hidden"
          onClick={onMenuClick}
        >
          <Menu size={20} />
        </button>

        <div className="hidden items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400 sm:flex">
          <span className="font-medium text-slate-400 dark:text-slate-500">{settings.academyName}</span>
          <ChevronRight size={14} className="text-slate-300 dark:text-slate-600" />
          <span className="font-semibold capitalize text-slate-800 dark:text-slate-100">{pageName}</span>
        </div>
      </div>

      {/* Right */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setThemeMode((prev) => (prev === 'light' ? 'dark' : 'light'))}
          className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          aria-label={themeMode === 'light' ? 'Tungi rejimga o`tish' : 'Kunduzgi rejimga o`tish'}
          title={themeMode === 'light' ? 'Tungi rejim' : 'Kunduzgi rejim'}
        >
          {themeMode === 'light' ? <Moon size={17} /> : <Sun size={17} />}
        </button>

        <div className="h-6 w-px bg-slate-200 dark:bg-slate-700" />

        {/* User dropdown */}
        <div ref={dropdownRef} className="relative">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="group flex items-center gap-2.5 rounded-xl p-1.5 transition-all duration-200 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <NameAvatar fullName={user?.fullName} className="w-8 h-8 text-sm shadow-sm" />
            <div className="hidden sm:block text-left">
              <p className="text-sm font-semibold leading-none text-slate-800 dark:text-slate-100">{user?.fullName}</p>
              <span className={`text-[11px] font-medium ${
                user?.role === 'SUPERADMIN' ? 'text-violet-600' : 'text-indigo-600'
              }`}>{user?.role}</span>
            </div>
            <ChevronDown size={14} className={`text-slate-400 transition-transform duration-200 dark:text-slate-500 ${dropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          {dropdownOpen && (
            <div className="animate-in slide-in-from-top-2 fade-in absolute right-0 top-full z-50 mt-2 w-52 overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-xl duration-200 dark:border-slate-700 dark:bg-slate-900">
              <div className="border-b border-slate-100 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-800">
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{user?.fullName}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{user?.email}</p>
              </div>
              <div className="py-1">
                {user?.role === 'SUPERADMIN' && (
                  <>
                    <button
                      onClick={() => { navigate('/profile'); setDropdownOpen(false); }}
                      className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-700 transition hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800"
                    >
                      <User size={15} className="text-slate-400" />
                      Profil
                    </button>
                    <button
                      onClick={() => { navigate('/settings'); setDropdownOpen(false); }}
                      className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-700 transition hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800"
                    >
                      <Settings size={15} className="text-slate-400" />
                      Sozlamalar
                    </button>
                    <div className="my-1 border-t border-slate-100 dark:border-slate-700" />
                  </>
                )}
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-rose-600 transition hover:bg-rose-50 dark:hover:bg-rose-950/30"
                >
                  <LogOut size={15} />
                  Chiqish
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
