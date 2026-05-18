import { useNavigate } from 'react-router-dom';
import { FileQuestion, ArrowLeft } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { getHomePathByRole } from '@/utils/roleNavigation';

export default function NotFoundPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] text-center px-4 animate-in fade-in zoom-in-95 duration-500">
      <div className="w-24 h-24 rounded-3xl bg-slate-100 flex items-center justify-center mb-8 shadow-inner">
        <FileQuestion size={48} className="text-slate-400" />
      </div>
      <h1 className="text-4xl font-bold text-slate-900 mb-4 tracking-tight">404 - Sahifa topilmadi</h1>
      <p className="text-slate-500 mb-8 max-w-md mx-auto text-lg">
        Kechirasiz, siz qidirayotgan sahifa mavjud emas yoki o'chirilgan bo'lishi mumkin.
      </p>
      <button onClick={() => navigate(getHomePathByRole(user?.role))} className="btn-primary px-6 py-3 text-base">
        <ArrowLeft size={18} /> Bosh sahifaga qaytish
      </button>
    </div>
  );
}
