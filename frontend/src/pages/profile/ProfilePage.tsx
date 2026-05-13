import { useAuthStore } from '@/store/authStore';
import PageHeader from '@/components/common/PageHeader';
import NameAvatar from '@/components/common/NameAvatar';
import { User, Mail, Shield, Key } from 'lucide-react';
import { toast } from 'sonner';

export default function ProfilePage() {
  const { user } = useAuthStore();

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
                <label className="label flex items-center gap-2"><Mail size={14} /> Email</label>
                <input type="text" className="input-field bg-slate-50 cursor-not-allowed" value={user?.email || 'Kiritilmagan'} disabled />
              </div>
              <div className="space-y-1.5">
                <label className="label flex items-center gap-2"><Shield size={14} /> Ruxsat (Rol)</label>
                <input type="text" className="input-field bg-slate-50 cursor-not-allowed text-indigo-600 font-semibold" value={user?.role || ''} disabled />
              </div>
            </div>

            <hr className="border-slate-100" />

            <div>
              <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2"><Key size={16} /> Parolni o'zgartirish</h3>
              <div className="space-y-4 max-w-sm">
                <input type="password" placeholder="Joriy parol" className="input-field" />
                <input type="password" placeholder="Yangi parol" className="input-field" />
                <input type="password" placeholder="Yangi parolni tasdiqlang" className="input-field" />
                <button className="btn-primary" onClick={() => toast.success('Parol yangilandi')}>
                  Parolni saqlash
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
