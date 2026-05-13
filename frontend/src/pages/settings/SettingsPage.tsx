import { useEffect, useMemo, useState } from 'react';
import { Settings, Save, Building2, Phone, MapPin, AlignLeft, Image as ImageIcon } from 'lucide-react';
import { toast } from 'sonner';
import { settingsApi } from '@/api/settings.api';
import { getErrorMessage } from '@/api/http';
import PageHeader from '@/components/common/PageHeader';
import { useAuthStore } from '@/store/authStore';
import { useSettingsStore } from '@/store/settingsStore';
import { resolveUploadUrl } from '@/utils/resolveUploadUrl';

type SettingsForm = {
  academyName: string;
  logoUrl: string;
  phone: string;
  address: string;
  description: string;
};

const defaultForm: SettingsForm = {
  academyName: '',
  logoUrl: '',
  phone: '',
  address: '',
  description: '',
};

export default function SettingsPage() {
  const { user } = useAuthStore();
  const { updateSettings } = useSettingsStore();
  const [formData, setFormData] = useState<SettingsForm>(defaultForm);
  const [loading, setLoading] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [logoLoadFailed, setLogoLoadFailed] = useState(false);

  const isSuperAdmin = user?.role === 'SUPERADMIN';
  const resolvedLogoUrl = useMemo(() => resolveUploadUrl(formData.logoUrl), [formData.logoUrl]);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const response = await settingsApi.getSettings();
      const logoUrl = resolveUploadUrl(response.logoUrl);
      const nextData: SettingsForm = {
        academyName: response.academyName || '',
        logoUrl,
        phone: response.phone || '',
        address: response.address || '',
        description: response.description || '',
      };
      setFormData(nextData);
      setLogoLoadFailed(false);
      updateSettings(nextData);
    } catch (error) {
      toast.error(getErrorMessage(error, "Sozlamalarni yuklashda xatolik"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!isSuperAdmin) return;

    try {
      setLoading(true);
      const updated = await settingsApi.updateSettings({
        academyName: formData.academyName,
        phone: formData.phone,
        address: formData.address,
        description: formData.description,
      });

      const logoUrl = resolveUploadUrl(updated.logoUrl);
      const nextData: SettingsForm = {
        academyName: updated.academyName || '',
        logoUrl,
        phone: updated.phone || '',
        address: updated.address || '',
        description: updated.description || '',
      };
      setFormData(nextData);
      setLogoLoadFailed(false);
      updateSettings(nextData);
      toast.success('Sozlamalar saqlandi');
    } catch (error) {
      toast.error(getErrorMessage(error, "Sozlamalarni saqlashda xatolik"));
    } finally {
      setLoading(false);
    }
  };

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !isSuperAdmin) return;

    try {
      setUploadingLogo(true);
      const updated = await settingsApi.uploadLogo(file);
      const logoUrl = resolveUploadUrl(updated.logoUrl);
      setFormData((prev) => ({ ...prev, logoUrl }));
      setLogoLoadFailed(false);
      updateSettings({ logoUrl });
      toast.success('Logo muvaffaqiyatli yangilandi');
    } catch (error) {
      toast.error(getErrorMessage(error, 'Logo yuklashda xatolik'));
    } finally {
      setUploadingLogo(false);
      event.target.value = '';
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <PageHeader title="Sozlamalar" subtitle="Akademiya va tizim sozlamalarini boshqarish" icon={<Settings size={20} />} />

      <div className="card">
        <form onSubmit={handleSubmit}>
          <div className="p-6 md:p-8 space-y-8">
            <div>
              <h3 className="text-lg font-bold text-slate-900 mb-4">Akademiya logotipi</h3>
              <div className="flex flex-col items-start gap-4 sm:flex-row sm:gap-6">
                <div className="w-24 h-24 rounded-2xl border-2 border-dashed border-slate-300 flex items-center justify-center bg-slate-50 relative overflow-hidden group">
                  {resolvedLogoUrl && !logoLoadFailed ? (
                    <img
                      src={resolvedLogoUrl}
                      alt="Logo"
                      className="w-full h-full object-cover"
                      onError={() => setLogoLoadFailed(true)}
                      onLoad={() => setLogoLoadFailed(false)}
                    />
                  ) : (
                    <ImageIcon size={32} className="text-slate-400" />
                  )}
                  {isSuperAdmin && (
                    <label className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer">
                      <span className="text-white text-xs font-medium">{uploadingLogo ? 'Yuklanmoqda...' : "O'zgartirish"}</span>
                      <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleLogoUpload} />
                    </label>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-500 mb-3 leading-relaxed">
                    Logotip tizimning barcha qismlarida ko'rinadi. Tavsiya etiladigan o'lcham: 256x256px.
                  </p>
                  {isSuperAdmin && (
                    <label className="btn-secondary text-xs px-4 py-2 cursor-pointer inline-flex w-full sm:w-auto justify-center">
                      {uploadingLogo ? 'Yuklanmoqda...' : 'Rasm yuklash'}
                      <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleLogoUpload} />
                    </label>
                  )}
                </div>
              </div>
            </div>

            <hr className="border-slate-100" />

            <div>
              <h3 className="text-lg font-bold text-slate-900 mb-4">Asosiy ma'lumotlar</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1.5">
                  <label className="label flex items-center gap-2">
                    <Building2 size={14} /> Akademiya nomi
                  </label>
                  <input
                    type="text"
                    className="input-field"
                    value={formData.academyName}
                    onChange={(e) => setFormData({ ...formData, academyName: e.target.value })}
                    disabled={!isSuperAdmin || loading}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="label flex items-center gap-2">
                    <Phone size={14} /> Telefon raqam
                  </label>
                  <input
                    type="text"
                    className="input-field"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    disabled={!isSuperAdmin || loading}
                  />
                </div>
                <div className="md:col-span-2 space-y-1.5">
                  <label className="label flex items-center gap-2">
                    <MapPin size={14} /> Manzil
                  </label>
                  <input
                    type="text"
                    className="input-field"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    disabled={!isSuperAdmin || loading}
                  />
                </div>
                <div className="md:col-span-2 space-y-1.5">
                  <label className="label flex items-center gap-2">
                    <AlignLeft size={14} /> Qisqacha tavsif
                  </label>
                  <textarea
                    className="input-field min-h-24 resize-none"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    disabled={!isSuperAdmin || loading}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="px-6 md:px-8 py-5 bg-slate-50 border-t border-slate-100 flex items-center justify-between rounded-b-2xl">
            <p className="text-sm text-slate-500">{!isSuperAdmin && "Faqat Super Admin sozlamalarni o'zgartirishi mumkin."}</p>
            {isSuperAdmin && (
              <button type="submit" disabled={loading} className="btn-primary">
                {loading ? 'Saqlanmoqda...' : <>
                  <Save size={16} /> Saqlash
                </>}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
