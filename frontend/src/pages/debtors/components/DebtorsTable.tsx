import { useState } from 'react';
import { DataGrid, type GridColDef, type GridPaginationModel } from '@mui/x-data-grid';
import { ChevronDown, ChevronLeft, ChevronRight, CreditCard, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import StatusBadge from '@/components/common/StatusBadge';
import MoneyText from '@/components/common/MoneyText';
import { Badge } from '@/components/ui/badge';
import type { DebtorListItem } from '../types';

interface DebtorsTableProps {
  rows: DebtorListItem[];
  loading: boolean;
  totalRows: number;
  paginationModel: GridPaginationModel;
  onPaginationModelChange: (model: GridPaginationModel) => void;
  onViewDetails: (studentId: string) => void;
  onPay: (row: DebtorListItem) => void;
}

export default function DebtorsTable({
  rows,
  loading,
  totalRows,
  paginationModel,
  onPaginationModelChange,
  onViewDetails,
  onPay,
}: DebtorsTableProps) {
  const [expandedStudentId, setExpandedStudentId] = useState<string | null>(null);
  const page = paginationModel.page ?? 0;
  const pageSize = paginationModel.pageSize ?? 10;
  const totalPages = Math.max(1, Math.ceil(totalRows / pageSize));
  const from = totalRows === 0 ? 0 : page * pageSize + 1;
  const to = Math.min((page + 1) * pageSize, totalRows);

  const goPrevPage = () => {
    if (page <= 0) return;
    onPaginationModelChange({ ...paginationModel, page: page - 1 });
  };

  const goNextPage = () => {
    if (page >= totalPages - 1) return;
    onPaginationModelChange({ ...paginationModel, page: page + 1 });
  };

  const columns: GridColDef<DebtorListItem>[] = [
    {
      field: 'fullName',
      headerName: "O'quvchi",
      flex: 1.5,
      minWidth: 200,
      renderCell: (params) => (
        <div className="flex flex-col py-2">
          <span className="font-semibold text-slate-800">{params.value}</span>
        </div>
      ),
    },
    {
      field: 'phone',
      headerName: 'Telefon',
      flex: 1,
      minWidth: 150,
      renderCell: (params) => <span className="font-medium text-slate-600">{params.value}</span>,
    },
    {
      field: 'parentPhone',
      headerName: 'Parent phone',
      flex: 1,
      minWidth: 150,
      renderCell: (params) => <span className="text-slate-500">{params.value || '-'}</span>,
    },
    {
      field: 'groups',
      headerName: 'Guruhlar',
      flex: 1.5,
      minWidth: 200,
      renderCell: (params) => (
        <div className="flex flex-wrap gap-1 py-1">
          {params.value.map((g: any) => (
            <Badge key={g.id} variant="secondary" className="bg-slate-100 text-slate-600 text-[10px]">
              {g.name}
            </Badge>
          ))}
        </div>
      ),
    },
    {
      field: 'monthlyFeeTotal',
      headerName: "Oylik to'lov umumiy",
      flex: 1,
      minWidth: 150,
      renderCell: (params) => <MoneyText amount={params.value} className="font-medium text-slate-700" />,
    },
    {
      field: 'totalDebt',
      headerName: 'Jami qarz',
      flex: 1,
      minWidth: 150,
      renderCell: (params) => <MoneyText amount={params.value} className="text-rose-600 font-bold" />,
    },
    {
      field: 'maxOverdueDays',
      headerName: 'Kechikkan kun',
      flex: 0.8,
      minWidth: 120,
      renderCell: (params) => {
        const days = params.value;
        let bg = 'bg-yellow-100 text-yellow-700';
        if (days >= 20) bg = 'bg-rose-100 text-rose-700';
        else if (days >= 10) bg = 'bg-amber-100 text-amber-700';
        return <Badge className={`${bg} border-none`}>{days} kun</Badge>;
      },
    },
    {
      field: 'status',
      headerName: 'Status',
      flex: 0.8,
      minWidth: 120,
      renderCell: (params) => <StatusBadge status={params.value} size="sm" />,
    },
    {
      field: 'actions',
      headerName: 'Amallar',
      flex: 1,
      minWidth: 180,
      sortable: false,
      renderCell: (params) => (
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); onViewDetails(params.row.studentId); }}>
            <Eye size={14} className="mr-1" /> View
          </Button>
          <Button variant="default" size="sm" className="bg-indigo-600 hover:bg-indigo-700" onClick={(e) => { e.stopPropagation(); onPay(params.row); }}>
            <CreditCard size={14} className="mr-1" /> To'lov
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="w-full rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="md:hidden">
        {loading ? (
          <div className="p-6 text-center text-sm text-slate-500">Yuklanmoqda...</div>
        ) : rows.length === 0 ? (
          <div className="p-6 text-center text-sm text-slate-500">Qarzdor topilmadi</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {rows.map((row) => (
              <div key={row.studentId} className="p-4 active:bg-slate-50">
                <button
                  type="button"
                  onClick={() => setExpandedStudentId((prev) => (prev === row.studentId ? null : row.studentId))}
                  className="flex w-full items-center justify-between gap-3 text-left"
                >
                  <p className="min-w-0 truncate font-semibold text-slate-800">{row.fullName}</p>
                  <div className="flex items-center gap-2 shrink-0">
                    <StatusBadge status={row.status} size="sm" />
                    <ChevronDown
                      size={16}
                      className={`text-slate-400 transition-transform ${expandedStudentId === row.studentId ? 'rotate-180' : ''}`}
                    />
                  </div>
                </button>

                {expandedStudentId === row.studentId && (
                  <div className="mt-3 space-y-3 animate-fade-in">
                    <p className="text-xs text-slate-500 truncate">Telefon: {row.phone || '-'}</p>

                    <div className="flex flex-wrap gap-1">
                      {row.groups.map((g) => (
                        <Badge key={g.id} variant="secondary" className="bg-slate-100 text-slate-600 text-[10px]">
                          {g.name}
                        </Badge>
                      ))}
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="rounded-lg border border-slate-100 bg-slate-50 px-2 py-1.5">
                        <p className="text-slate-400">Oylik to'lov</p>
                        <MoneyText amount={row.monthlyFeeTotal} className="font-semibold text-slate-700" />
                      </div>
                      <div className="relative pt-5">
                        <Badge
                          className={`absolute left-0 top-0 ${
                            row.maxOverdueDays >= 20
                              ? 'bg-rose-100 text-rose-700'
                              : row.maxOverdueDays >= 10
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-yellow-100 text-yellow-700'
                          } border-none`}
                        >
                          {row.maxOverdueDays} kun kechikkan
                        </Badge>
                        <div className="rounded-lg border border-slate-100 bg-rose-50/40 px-2 py-1.5">
                          <p className="text-slate-400">Jami qarz</p>
                          <MoneyText amount={row.totalDebt} className="font-bold text-rose-600" />
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-end">
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            onViewDetails(row.studentId);
                          }}
                        >
                          <Eye size={14} className="mr-1" /> View
                        </Button>
                        <Button
                          variant="default"
                          size="sm"
                          className="bg-indigo-600 hover:bg-indigo-700"
                          onClick={(e) => {
                            e.stopPropagation();
                            onPay(row);
                          }}
                        >
                          <CreditCard size={14} className="mr-1" /> To'lov
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50 px-3 py-2 text-xs text-slate-500">
          <span>
            {from}-{to} / {totalRows}
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={goPrevPage}
              disabled={page <= 0}
              className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 disabled:opacity-40"
            >
              <ChevronLeft size={14} />
            </button>
            <button
              type="button"
              onClick={goNextPage}
              disabled={page >= totalPages - 1}
              className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 disabled:opacity-40"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>

      <div className="hidden md:block h-[620px]">
        <DataGrid
          rows={rows}
          columns={columns}
          getRowId={(row) => row.studentId}
          loading={loading}
          paginationMode="server"
          rowCount={totalRows}
          paginationModel={paginationModel}
          onPaginationModelChange={onPaginationModelChange}
          pageSizeOptions={[10, 20, 50]}
          disableRowSelectionOnClick
          onRowClick={(params) => onViewDetails(params.row.studentId)}
          sx={{
            border: 0,
            '& .MuiDataGrid-columnHeaders': {
              backgroundColor: '#f8fafc',
              borderBottom: '1px solid #e2e8f0',
              color: '#475569',
              fontWeight: 600,
            },
            '& .MuiDataGrid-cell': {
              borderBottom: '1px solid #f1f5f9',
            },
            '& .MuiDataGrid-row:hover': {
              backgroundColor: '#f8fafc',
              cursor: 'pointer',
            },
          }}
        />
      </div>
    </div>
  );
}
