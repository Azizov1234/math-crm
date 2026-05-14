import { useState, type FormEvent } from 'react';
import { toast } from 'sonner';
import { authApi } from '@/api/auth.api';
import { getErrorMessage } from '@/api/http';
import PageHeader from '@/components/common/PageHeader';
import NameAvatar from '@/components/common/NameAvatar';
import { useAuthStore } from '@/store/authStore';
import { User, Mail, Shield, Key, AtSign, Phone } from 'lucide-react';

export default function ProfilePage() {
  const { user } = useAuthStore();
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [changingPassword, setChangingPassword] = useState(false);

  const handleChangePassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
      toast.error("Parol maydonlarini to'liq kiriting");
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      toast.error("Yangi parol kamida 6 ta belgidan iborat bo'lishi kerak");
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error('Yangi parol va tasdiqlash paroli mos emas');
      return;
    }

    try {
      setChangingPassword(true);
      await authApi.changePassword({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });

      toast.success("Parol muvaffaqiyatli o'zgartirildi");
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
    } catch (error) {
      toast.error(getErrorMessage(error, "Parolni o'zgartirishda xatolik"));
    } finally {
      setChangingPassword(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <PageHeader
        title="Mening profilim"
        subtitle="Shaxsiy ma'lumotlar va xavfsizlik sozlamalari"
        icon={<User size={20} />}
      />

      <div className="card p-6 md:p-8">
        <div className="flex flex-col md:flex-row gap-8 items-start">
          <div className="flex flex-col items-center gap-4">
            <NameAvatar fullName={user?.fullName} maxChars={2} className="w-32 h-32 rounded-full text-4xl shadow-xl border-4 border-white" />
            <p className="text-xs text-slate-500 text-center max-w-[180px]">
              Avatar avtomatik yaratiladi, rasm yuklash ishlatilmaydi.
            </p>
          </div>

          <div className="flex-1 space-y-6 w-full">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-1.5">
                <label className="label flex items-center gap-2"><User size={14} /> To'liq ism</label>
                <input type="text" className="input-field bg-slate-50 cursor-not-allowed" value={user?.fullName || ''} disabled />
              </div>
              <div className="space-y-1.5">
                <label className="label flex items-center gap-2"><AtSign size={14} /> Username</label>
                <input type="text" className="input-field bg-slate-50 cursor-not-allowed" value={user?.username || '-'} disabled />
              </div>
              <div className="space-y-1.5">
                <label className="label flex items-center gap-2"><Mail size={14} /> Email</label>
                <input type="text" className="input-field bg-slate-50 cursor-not-allowed" value={user?.email || 'Kiritilmagan'} disabled />
              </div>
              <div className="space-y-1.5">
                <label className="label flex items-center gap-2"><Phone size={14} /> Telefon</label>
                <input type="text" className="input-field bg-slate-50 cursor-not-allowed" value={user?.phone || 'Kiritilmagan'} disabled />
              </div>
              <div className="space-y-1.5">
                <label className="label flex items-center gap-2"><Shield size={14} /> Ruxsat (Rol)</label>
                <input type="text" className="input-field bg-slate-50 cursor-not-allowed text-indigo-600 font-semibold" value={user?.role || ''} disabled />
              </div>
            </div>

            <hr className="border-slate-100" />

            <div>
              <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2"><Key size={16} /> Parolni o'zgartirish</h3>
              <form onSubmit={handleChangePassword} className="max-w-sm space-y-3">
                <input
                  type="password"
                  className="input-field"
                  placeholder="Joriy parol"
                  value={passwordForm.currentPassword}
                  onChange={(event) => setPasswordForm((prev) => ({ ...prev, currentPassword: event.target.value }))}
                  autoComplete="current-password"
                />
                <input
                  type="password"
                  className="input-field"
                  placeholder="Yangi parol"
                  value={passwordForm.newPassword}
                  onChange={(event) => setPasswordForm((prev) => ({ ...prev, newPassword: event.target.value }))}
                  autoComplete="new-password"
                />
                <input
                  type="password"
                  className="input-field"
                  placeholder="Yangi parolni tasdiqlang"
                  value={passwordForm.confirmPassword}
                  onChange={(event) => setPasswordForm((prev) => ({ ...prev, confirmPassword: event.target.value }))}
                  autoComplete="new-password"
                />
                <button type="submit" className="btn-primary w-full justify-center" disabled={changingPassword}>
                  {changingPassword ? 'Saqlanmoqda...' : "Parolni yangilash"}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
