import axiosClient, { resolveMediaUrl } from './AxiosClient';

/**
 * Expense claims. The same endpoints the CRM uses - every list is already scoped
 * to whoever the signed-in user reports on, so nothing is filtered again here.
 */

export const EXPENSE_STATUS = {
  pending: 0,
  approved: 1,
  rejected: 2,
  checked: 3,
  checkedByReporting: 4,
  hold: 5,
} as const;

export const EXPENSE_STATUS_LABEL: Record<number, string> = {
  0: 'Pending',
  1: 'Approved',
  2: 'Rejected',
  3: 'Checked',
  4: 'Checked By Reporting',
  5: 'Hold',
};

/** Travelling expenses are claimed per kilometre; daily ones carry a fixed rate. */
export const ALLOWANCE_TYPE = { travelling: 1, daily: 2 } as const;

export type ExpenseFilters = {
  executive_id?: number;
  expenses_type?: number;
  status?: number;
  start_date?: string;
  end_date?: string;
  search?: string;
};

const num = (value: any) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

export const normalizeExpenseType = (row: any) => ({
  id: num(row?.id),
  name: row?.name ?? '',
  rate: num(row?.rate),
  allowanceTypeId: num(row?.allowance_type_id ?? row?.allowanceTypeId),
  allowanceTypeName: row?.allowance_type_name ?? row?.allowanceTypeName ?? '',
  payrollId: row?.payroll_id ?? row?.payrollId ?? null,
  payrollName: row?.payroll_name ?? row?.payrollName ?? '',
  isTravelling:
    num(row?.allowance_type_id ?? row?.allowanceTypeId) === ALLOWANCE_TYPE.travelling,
});

export const normalizeExpense = (row: any) => ({
  id: num(row?.id),
  expensesType: row?.expenses_type ?? row?.expensesType ?? null,
  expenseTypeName: row?.expense_type_name ?? row?.expenseTypeName ?? '',
  userId: row?.user_id ?? row?.userId ?? null,
  userName: row?.user_name ?? row?.userName ?? '',
  employeeCode: row?.employee_code ?? row?.employeeCode ?? '',
  designationName: row?.designation_name ?? row?.designationName ?? '',
  branchName: row?.branch_name ?? row?.branchName ?? '',
  date: row?.date ?? '',
  claimAmount: num(row?.claim_amount ?? row?.claimAmount),
  approveAmount:
    row?.approve_amount ?? row?.approveAmount ?? null,
  startKm: row?.start_km ?? row?.startKm ?? null,
  stopKm: row?.stop_km ?? row?.stopKm ?? null,
  totalKm: row?.total_km ?? row?.totalKm ?? null,
  note: row?.note ?? '',
  checkerStatus: num(row?.checker_status ?? row?.checkerStatus),
  checkerStatusName:
    row?.checker_status_name ?? row?.checkerStatusName ?? EXPENSE_STATUS_LABEL[num(row?.checker_status)],
  reason: row?.reason ?? '',
  approveRejectByName: row?.approve_reject_by_name ?? row?.approveRejectByName ?? '',
  createdAt: row?.created_at ?? row?.createdAt ?? null,
  attachments: (row?.attachments || []).map((item: any) => ({
    id: num(item?.id),
    fileName: item?.file_name ?? item?.fileName ?? '',
    mimeType: item?.mime_type ?? item?.mimeType ?? '',
    size: num(item?.size),
    // Older rows may carry a path rather than a full URL, and the API is mounted
    // under a prefix on live, so both shapes go through the shared resolver.
    url: resolveMediaUrl(item?.url ?? ''),
  })),
});

/** The form payload. Leave user_id out and the API files it against the signed-in user. */
export type ExpensePayload = {
  expenses_type: number;
  date: string;
  start_km?: string | number | null;
  stop_km?: string | number | null;
  claim_amount?: string | number | null;
  note?: string | null;
  user_id?: number | null;
};

const toFormData = (payload: ExpensePayload, attachments: any[] = []) => {
  const body = new FormData();
  Object.entries(payload).forEach(([key, value]) => {
    if (value === null || value === undefined || value === '') return;
    body.append(key, String(value));
  });
  attachments.forEach((asset, index) => {
    body.append('expense_file', {
      uri: asset.path || asset.uri,
      name: asset.filename || asset.name || `expense-${index + 1}.jpg`,
      type: asset.mime || asset.type || 'image/jpeg',
    } as any);
  });
  return body;
};

export const expenseApi = {
  /** Team list. Pass executive_id with the signed-in user's id for "my expenses". */
  list: (page = 1, filters: ExpenseFilters = {}, perPage = 20) =>
    axiosClient.get('api/expenses', {
      params: { page, page_size: perPage, ...filters },
    }),

  detail: (id: number) => axiosClient.get(`api/expenses/${id}`),

  /** Status counts and amounts for the same scope and filters as the list. */
  summary: (filters: ExpenseFilters = {}) =>
    axiosClient.get('api/expenses/summary', { params: filters }),

  /** Signed-in user, their grade, the types that grade allows, and the visible users. */
  options: () => axiosClient.get('api/expenses/options'),

  logs: (id: number) => axiosClient.get(`api/expenses/${id}/logs`),

  create: (payload: ExpensePayload, attachments: any[] = []) =>
    axiosClient.post('api/expenses', toFormData(payload, attachments), {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  /** Only while the expense is still Pending. */
  update: (id: number, payload: ExpensePayload, attachments: any[] = []) =>
    axiosClient.put(`api/expenses/${id}`, toFormData(payload, attachments), {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  /** Only while the expense is still Pending. */
  remove: (id: number) => axiosClient.delete(`api/expenses/${id}`),

  /** Drops one already-uploaded file. Only while the expense is still Pending. */
  removeAttachment: (id: number, attachmentId: number) =>
    axiosClient.delete(`api/expenses/${id}/attachments/${attachmentId}`),

  /** The reporting manager's single approval action. Approve/reject stays in the CRM. */
  checkByReporting: (id: number) =>
    axiosClient.patch(`api/expenses/${id}/checked-by-reporting`),
};
