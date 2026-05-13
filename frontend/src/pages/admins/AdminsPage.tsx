import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { ChevronDown, ChevronLeft, ChevronRight, Edit, Plus, Search, ShieldCheck, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { adminsApi } from '@/api/admins.api';
import { getErrorMessage } from '@/api/http';
import ActionMenu from '@/components/common/ActionMenu';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import EmptyState from '@/components/common/EmptyState';
import { Field, FormActions, inputCls, Modal, selectCls } from '@/components/common/Modal';
import NameAvatar from '@/components/common/NameAvatar';
import PageHeader from '@/components/common/PageHeader';
import StatusBadge from '@/components/common/StatusBadge';
import { formatDate } from '@/utils/formatDate';

type AdminRow = {
  id: string;
  fullName: string;
  username: string;
  email?: string | null;
  phone?: string | null;
  status: string;
  createdAt: string;
};

type AdminForm = {
  fullName: string;
  username: string;
  email: string;
  phone: string;
  password: string;
  status: string;
};

const initialForm: AdminForm = {
  fullName: '',
  username: '',
  email: '',
  phone: '',
  password: '',
  status: 'ACTIVE',
};

export default function AdminsPage() {
  const [admins, setAdmins] = useState<AdminRow[]>([]);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [editingAdminId, setEditingAdminId] = useState<string | null>(null);
  const [expandedAdminId, setExpandedAdminId] = useState<string | null>(null);
  const [createForm, setCreateForm] = useState<AdminForm>(initialForm);
  const [editForm, setEditForm] = useState<AdminForm>(initialForm);
  const [loading, setLoading] = useState(false);

  const loadAdmins = async () => {
    try {
      setLoading(true);
      const response = await adminsApi.getAll({
        page,
        limit,
        search: search || undefined,
        status: filterStatus || undefined,
      });

      const rows = (response.data ?? []) as AdminRow[];
      const meta = response.meta;

      setAdmins(rows);
      setTotal(meta?.total ?? rows.length);
      setTotalPages(Math.max(meta?.totalPages ?? 1, 1));

      const metaPage = meta?.page ?? page;
      if (metaPage !== page) {
        setPage(metaPage);
      }
    } catch (error) {
      toast.error(getErrorMessage(error, 'Adminlarni yuklashda xatolik'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAdmins();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, limit, search, filterStatus]);

  useEffect(() => {
    if (!loading && page > totalPages) {
      setPage(totalPages);
    }
  }, [loading, page, totalPages]);

  useEffect(() => {
    if (expandedAdminId && !admins.some((admin) => admin.id === expandedAdminId)) {
      setExpandedAdminId(null);
    }
  }, [admins, expandedAdminId]);

  const filtered = useMemo(() => admins, [admins]);

  const startItem = total === 0 ? 0 : (page - 1) * limit + 1;
  const endItem = total === 0 ? 0 : Math.min(page * limit, total);

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await adminsApi.delete(deleteId);
      toast.success("Admin muvaffaqiyatli o'chirildi");
      setDeleteId(null);
      await loadAdmins();
    } catch (error) {
      toast.error(getErrorMessage(error, "Adminni o'chirishda xatolik"));
    }
  };

  const toggleStatus = async (admin: AdminRow) => {
    const nextStatus = admin.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      await adminsApi.updateStatus(admin.id, nextStatus);
      toast.success('Admin statusi yangilandi');
      await loadAdmins();
    } catch (error) {
      toast.error(getErrorMessage(error, 'Statusni yangilashda xatolik'));
    }
  };

  const openCreateModal = () => {
    setCreateForm(initialForm);
    setCreateOpen(true);
  };

  const openEditModal = async (admin: AdminRow) => {
    try {
      const fullAdmin = await adminsApi.getById(admin.id);
      setEditingAdminId(fullAdmin.id);
      setEditForm({
        fullName: fullAdmin.fullName ?? admin.fullName,
        username: fullAdmin.username ?? admin.username,
        email: fullAdmin.email ?? '',
        phone: fullAdmin.phone ?? '',
        password: '',
        status: fullAdmin.status ?? admin.status,
      });
    } catch (error) {
      toast.error(getErrorMessage(error, "Admin ma'lumotini yuklashda xatolik"));
      setEditingAdminId(admin.id);
      setEditForm({
        fullName: admin.fullName,
        username: admin.username,
        email: admin.email ?? '',
        phone: admin.phone ?? '',
        password: '',
        status: admin.status,
      });
    } finally {
      setEditOpen(true);
    }
  };

  const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      setCreateLoading(true);
      await adminsApi.create({
        fullName: createForm.fullName.trim(),
        username: createForm.username.trim(),
        email: createForm.email.trim() || undefined,
        phone: createForm.phone.trim() || undefined,
        password: createForm.password,
        status: createForm.status,
      });
      toast.success("Admin qo'shildi");
      setCreateOpen(false);
      await loadAdmins();
    } catch (error) {
      toast.error(getErrorMessage(error, "Admin qo'shishda xatolik"));
      console.error(error);
    } finally {
      setCreateLoading(false);
    }
  };

  const handleUpdate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editingAdminId) return;

    try {
      setEditLoading(true);
      const payload: Record<string, unknown> = {
        fullName: editForm.fullName.trim(),
        username: editForm.username.trim(),
        email: editForm.email.trim() || undefined,
        phone: editForm.phone.trim() || undefined,
        status: editForm.status,
      };

      if (editForm.password.trim()) {
        payload.password = editForm.password.trim();
      }

      await adminsApi.update(editingAdminId, payload);
      toast.success('Admin yangilandi');
      setEditOpen(false);
      await loadAdmins();
    } catch (error) {
      toast.error(getErrorMessage(error, 'Adminni yangilashda xatolik'));
      console.error(error);
    } finally {
      setEditLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Adminlar"
        subtitle={`Jami ${total} ta admin`}
        icon={<ShieldCheck size={20} />}
        actions={
          <button className="btn-primary w-full sm:w-auto justify-center" onClick={openCreateModal}>
            <Plus size={16} /> Admin qo'shish
          </button>
        }
      />

      <div className="card min-h-[calc(100vh-230px)] overflow-visible flex flex-col">
        <div className="flex flex-col sm:flex-row gap-3 p-4 border-b border-slate-100">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Ism yoki username bo'yicha qidirish..."
              className="input-field pl-9"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>
          <select
            className="select-field w-full sm:w-auto"
            value={filterStatus}
            onChange={(e) => {
              setFilterStatus(e.target.value);
              setPage(1);
            }}
          >
            <option value="">Barcha statuslar</option>
            <option value="ACTIVE">Faol</option>
            <option value="INACTIVE">Nofaol</option>
            <option value="BLOCKED">Bloklangan</option>
          </select>
        </div>

        <div className="flex-1 min-h-0">
          <div className="md:hidden divide-y divide-slate-100">
            {!loading && filtered.length === 0 ? (
              <EmptyState icon={<ShieldCheck />} title="Admin topilmadi" description="Qidiruv mezonlarini o'zgartiring" />
            ) : (
              filtered.map((admin) => {
                const isExpanded = expandedAdminId === admin.id;
                return (
                  <div key={admin.id} className="p-4">
                    <div className="flex items-center gap-3">
                      <NameAvatar fullName={admin.fullName} className="w-10 h-10 text-sm flex-shrink-0" />

                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-slate-800 text-sm truncate">{admin.fullName}</p>
                        <p className="text-xs text-slate-500 truncate">{admin.username}</p>
                      </div>

                      <div className="flex items-center gap-2">
                        <StatusBadge status={admin.status} size="sm" />
                        <button
                          type="button"
                          onClick={() => setExpandedAdminId(isExpanded ? null : admin.id)}
                          className="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-slate-200 text-slate-500 hover:text-slate-700 hover:bg-slate-50 transition"
                          aria-label={isExpanded ? "Yig'ish" : "Batafsil ko'rsatish"}
                        >
                          <ChevronDown size={16} className={`transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                        </button>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="mt-3 space-y-3 animate-fade-in">
                        <div className="grid grid-cols-2 gap-3 text-xs">
                          <div className="rounded-xl bg-slate-50 px-3 py-2">
                            <p className="text-slate-400 mb-1">Email</p>
                            <p className="font-medium text-slate-700 break-all">{admin.email || '-'}</p>
                          </div>
                          <div className="rounded-xl bg-slate-50 px-3 py-2">
                            <p className="text-slate-400 mb-1">Telefon</p>
                            <p className="font-medium text-slate-700">{admin.phone || '-'}</p>
                          </div>
                          <div className="rounded-xl bg-slate-50 px-3 py-2 col-span-2">
                            <p className="text-slate-400 mb-1">Qo'shilgan</p>
                            <p className="font-medium text-slate-700">{formatDate(admin.createdAt)}</p>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => openEditModal(admin)}
                            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-700 text-xs font-medium"
                          >
                            <Edit size={13} />
                            Tahrirlash
                          </button>
                          <button
                            type="button"
                            onClick={() => toggleStatus(admin)}
                            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-700 text-xs font-medium"
                          >
                            <ShieldCheck size={13} />
                            {admin.status === 'ACTIVE' ? 'Nofaol qilish' : 'Faollashtirish'}
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteId(admin.id)}
                            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-rose-200 bg-rose-50 text-rose-600 text-xs font-medium"
                          >
                            <Trash2 size={13} />
                            O'chirish
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          <div className="hidden md:block overflow-x-auto">
            <table className="w-full min-w-[920px]">
              <thead className="table-head">
                <tr>
                  <th className="table-cell">Admin</th>
                  <th className="table-cell">Username</th>
                  <th className="table-cell">Telefon</th>
                  <th className="table-cell">Status</th>
                  <th className="table-cell">Qo'shilgan sana</th>
                  <th className="table-cell text-right">Amallar</th>
                </tr>
              </thead>
              <tbody>
                {!loading && filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6}>
                      <EmptyState icon={<ShieldCheck />} title="Admin topilmadi" description="Qidiruv mezonlarini o'zgartiring" />
                    </td>
                  </tr>
                ) : (
                  filtered.map((admin) => (
                    <tr key={admin.id} className="table-row">
                      <td className="table-cell">
                        <div className="flex items-center gap-3">
                          <NameAvatar fullName={admin.fullName} className="w-9 h-9 text-sm flex-shrink-0" />
                          <div>
                            <p className="font-semibold text-slate-800 text-sm leading-none">{admin.fullName}</p>
                            <p className="text-xs text-slate-400 mt-0.5">{admin.email || '-'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="table-cell">
                        <code className="text-xs bg-slate-100 px-2 py-0.5 rounded-md text-slate-700">{admin.username}</code>
                      </td>
                      <td className="table-cell text-slate-600">{admin.phone || '-'}</td>
                      <td className="table-cell">
                        <StatusBadge status={admin.status} />
                      </td>
                      <td className="table-cell text-slate-500">{formatDate(admin.createdAt)}</td>
                      <td className="table-cell text-right">
                        <ActionMenu
                          actions={[
                            { label: 'Tahrirlash', icon: <Edit size={14} />, onClick: () => openEditModal(admin) },
                            {
                              label: admin.status === 'ACTIVE' ? 'Nofaol qilish' : 'Faollashtirish',
                              icon: <ShieldCheck size={14} />,
                              onClick: () => toggleStatus(admin),
                            },
                            { label: "O'chirish", icon: <Trash2 size={14} />, onClick: () => setDeleteId(admin.id), variant: 'danger' },
                          ]}
                        />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="px-4 py-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <p className="text-xs text-slate-500">
            {startItem}-{endItem} / {total} ta admin
          </p>
          <div className="flex items-center gap-2 flex-wrap">
            <select
              className="select-field w-auto py-2 text-xs"
              value={limit}
              onChange={(event) => {
                const nextLimit = Number(event.target.value);
                setLimit(nextLimit);
                setPage(1);
              }}
            >
              <option value={20}>20 ta</option>
              <option value={50}>50 ta</option>
              <option value={100}>100 ta</option>
            </select>

            <button
              type="button"
              onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
              disabled={page <= 1 || loading}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 text-xs font-medium text-slate-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50"
            >
              <ChevronLeft size={14} />
              Oldingi
            </button>

            <span className="text-xs text-slate-500 px-1.5">
              Sahifa {page} / {totalPages}
            </span>

            <button
              type="button"
              onClick={() => setPage((prev) => Math.min(prev + 1, totalPages))}
              disabled={page >= totalPages || loading}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 text-xs font-medium text-slate-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50"
            >
              Keyingi
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Adminni o'chirish"
        message="Bu admin soft delete qilinadi."
        confirmLabel="O'chirish"
        variant="danger"
      />

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Yangi admin qo'shish">
        <form onSubmit={handleCreate} className="space-y-4">
          <Field label="F.I.O" required>
            <input
              className={inputCls}
              value={createForm.fullName}
              onChange={(event) => setCreateForm((prev) => ({ ...prev, fullName: event.target.value }))}
              required
            />
          </Field>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Username" required>
              <input
                className={inputCls}
                value={createForm.username}
                onChange={(event) => setCreateForm((prev) => ({ ...prev, username: event.target.value }))}
                required
              />
            </Field>

            <Field label="Parol" required>
              <input
                type="password"
                minLength={6}
                className={inputCls}
                value={createForm.password}
                onChange={(event) => setCreateForm((prev) => ({ ...prev, password: event.target.value }))}
                required
              />
            </Field>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Email">
              <input
                type="email"
                className={inputCls}
                value={createForm.email}
                onChange={(event) => setCreateForm((prev) => ({ ...prev, email: event.target.value }))}
              />
            </Field>

            <Field label="Telefon">
              <input
                className={inputCls}
                value={createForm.phone}
                onChange={(event) => setCreateForm((prev) => ({ ...prev, phone: event.target.value }))}
              />
            </Field>
          </div>

          <Field label="Status" required>
            <select
              className={selectCls}
              value={createForm.status}
              onChange={(event) => setCreateForm((prev) => ({ ...prev, status: event.target.value }))}
            >
              <option value="ACTIVE">Faol</option>
              <option value="INACTIVE">Nofaol</option>
              <option value="BLOCKED">Bloklangan</option>
            </select>
          </Field>

          <FormActions onCancel={() => setCreateOpen(false)} loading={createLoading} submitLabel="Saqlash" />
        </form>
      </Modal>

      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Adminni tahrirlash">
        <form onSubmit={handleUpdate} className="space-y-4">
          <Field label="F.I.O" required>
            <input
              className={inputCls}
              value={editForm.fullName}
              onChange={(event) => setEditForm((prev) => ({ ...prev, fullName: event.target.value }))}
              required
            />
          </Field>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Username" required>
              <input
                className={inputCls}
                value={editForm.username}
                onChange={(event) => setEditForm((prev) => ({ ...prev, username: event.target.value }))}
                required
              />
            </Field>

            <Field label="Yangi parol (ixtiyoriy)">
              <input
                type="password"
                minLength={6}
                className={inputCls}
                value={editForm.password}
                onChange={(event) => setEditForm((prev) => ({ ...prev, password: event.target.value }))}
                placeholder="O'zgartirilmasa bo'sh qoldiring"
              />
            </Field>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Email">
              <input
                type="email"
                className={inputCls}
                value={editForm.email}
                onChange={(event) => setEditForm((prev) => ({ ...prev, email: event.target.value }))}
              />
            </Field>

            <Field label="Telefon">
              <input
                className={inputCls}
                value={editForm.phone}
                onChange={(event) => setEditForm((prev) => ({ ...prev, phone: event.target.value }))}
              />
            </Field>
          </div>

          <Field label="Status" required>
            <select
              className={selectCls}
              value={editForm.status}
              onChange={(event) => setEditForm((prev) => ({ ...prev, status: event.target.value }))}
            >
              <option value="ACTIVE">Faol</option>
              <option value="INACTIVE">Nofaol</option>
              <option value="BLOCKED">Bloklangan</option>
            </select>
          </Field>

          <FormActions onCancel={() => setEditOpen(false)} loading={editLoading} submitLabel="Yangilash" />
        </form>
      </Modal>
    </div>
  );
}
