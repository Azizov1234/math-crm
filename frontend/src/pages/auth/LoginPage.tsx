import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Eye, EyeOff, GraduationCap, Shield, BookOpen, Users, TrendingUp } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { authApi } from '@/api/auth.api';
import { getErrorMessage } from '@/api/http';

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuthStore();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      toast.error('Foydalanuvchi nomi va parolni kiriting');
      return;
    }
    try {
      setLoading(true);
      const result = await authApi.login({
        identifier: username.trim(),
        password,
      });

      login(
        {
          id: result.user.id,
          username: result.user.username,
          fullName: result.user.fullName,
          email: result.user.email,
          phone: result.user.phone,
          role: result.user.role,
          status: result.user.status,
          lastLoginAt: result.user.lastLoginAt,
        },
        result.accessToken,
        result.refreshToken,
      );

      toast.success(`Xush kelibsiz, ${result.user.fullName}!`);
      navigate('/dashboard', { replace: true });
    } catch (error) {
      toast.error(getErrorMessage(error, "Noto'g'ri foydalanuvchi nomi yoki parol"));
    } finally {
      setLoading(false);
    }
  };



  const features = [
    { icon: Users, text: "O'quvchilar va o'qituvchilarni boshqarish" },
    { icon: TrendingUp, text: "To'lovlar va moliyaviy hisobotlar" },
    { icon: BookOpen, text: 'Oylik imtihonlar va natijalar' },
    { icon: Shield, text: 'Rol asosida kirishni boshqarish' },
  ];

  return (
    <div className="flex w-full min-h-screen">
      {/* Left Panel */}
      <div className="hidden lg:flex flex-col justify-between w-[52%] bg-gradient-to-br from-indigo-950 via-indigo-900 to-violet-950 p-12 relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-20 -left-20 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-20 -right-20 w-80 h-80 bg-violet-500/15 rounded-full blur-3xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-blue-500/5 rounded-full blur-2xl" />
        </div>

        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-400 to-violet-500 flex items-center justify-center shadow-xl">
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="text-xl font-bold text-white">Matematika</span>
              <span className="text-xl font-light text-indigo-300 ml-1">Academy</span>
            </div>
          </div>
        </div>

        <div className="relative z-10 space-y-6">
          <div>
            <h2 className="text-4xl font-bold text-white leading-tight">
              Premium ta'lim<br />
              <span className="bg-gradient-to-r from-indigo-300 to-violet-300 bg-clip-text text-transparent">
                boshqaruv tizimi
              </span>
            </h2>
            <p className="text-indigo-300 mt-3 text-base leading-relaxed">
              O'zbekistonning eng zamonaviy akademiya CRM tizimi. O'quvchilar, o'qituvchilar va to'lovlarni bir joyda boshqaring.
            </p>
          </div>

          <div className="space-y-3">
            {features.map(({ icon: Icon, text }, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0">
                  <Icon size={16} className="text-indigo-300" />
                </div>
                <span className="text-sm text-indigo-200">{text}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10 text-xs text-indigo-500">© 2026 Matematika Academy CRM - Premium Edition</div>
      </div>

      {/* Right Panel */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12 bg-slate-50">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="flex items-center gap-2.5 mb-8 lg:hidden">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-md">
              <GraduationCap size={18} className="text-white" />
            </div>
            <span className="text-lg font-bold text-slate-800">Matematika Academy</span>
          </div>

          <div className="mb-8">
            <h1 className="text-2xl font-bold text-slate-900">Tizimga kirish</h1>
            <p className="text-slate-500 mt-1.5 text-sm">Foydalanuvchi nomi va parolingizni kiriting</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Foydalanuvchi nomi</label>
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                className="input-field"
                placeholder="superadmin"
                autoComplete="username"
              />
            </div>
            <div>
              <label className="label">Parol</label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="input-field pr-10"
                  placeholder="********"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition"
                >
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary justify-center py-3 text-base mt-2"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Kirish...
                </span>
              ) : 'Kirish'}
            </button>
          </form>

        </div>
      </div>
    </div>
  );
}

