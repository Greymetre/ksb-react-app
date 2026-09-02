import axiosClient from './AxiosClient';

/**
 * Loyalty invoices for the field app.
 *
 * These endpoints carry no permission of their own - no field role holds the CRM's
 * invoice permissions - and lean on the data scope instead. Whatever the signed-in
 * user is allowed to see is what comes back: their own retailers, plus the retailers
 * of everyone reporting to them, however many levels down. Someone with nobody under
 * them sees exactly their own. Nothing is filtered again here.
 */

export const INVOICE_STATUS_LABEL: Record<number, string> = {
  0: 'Pending',
  1: 'In Process',
  2: 'In Process',
  3: 'Approved',
  4: 'Rejected',
  5: 'On Hold',
};

/** One colour per outcome, so a list of twenty reads at a glance. */
export const INVOICE_STATUS_TONE: Record<number, { text: string; background: string }> = {
  0: { text: '#B45309', background: '#FEF3C7' },
  1: { text: '#1D4ED8', background: '#DBEAFE' },
  2: { text: '#1D4ED8', background: '#DBEAFE' },
  3: { text: '#15803D', background: '#DCFCE7' },
  4: { text: '#B91C1C', background: '#FEE2E2' },
  5: { text: '#7C3AED', background: '#EDE9FE' },
};

export type InvoiceListItem = {
  id: number;
  invoiceNumber: string;
  invoiceDate: string;
  amount: number;
  points: number;
  approvalStatus: number;
  statusLabel: string;
  retailerId: number;
  retailerName: string;
  shopName: string;
  mobile: string;
  dealerName: string | null;
  schemeName: string | null;
  createdByName: string | null;
  createdAt: string | null;
};

export type InvoiceSummary = {
  total: number;
  pending: number;
  hold: number;
  approved: number;
  inProcess: number;
  rejected: number;
  totalAmount: number;
};

export type InvoiceRetailer = {
  id: number;
  ownerName: string;
  shopName: string;
  mobile: string;
  city: string | null;
  address: string | null;
};

export type InvoiceDealer = {
  id: number;
  name: string;
  firmName: string;
  code: string | null;
};

export type InvoiceScheme = { id: number; name: string; code: string | null };

export type InvoiceAttachment = {
  id: number;
  url: string;
  fileName: string | null;
  mimeType: string | null;
  fileSize: number | null;
};

export type InvoiceDetail = InvoiceListItem & {
  approvalRemark: string | null;
  city: string | null;
  /** First file, kept for older screens; the full set is in `attachments`. */
  attachment: string | null;
  attachments: InvoiceAttachment[];
  /** True while nobody has acted on the invoice - pending or on hold. */
  canEdit: boolean;
  canDelete: boolean;
  schemeId: number | null;
  dealerId: number | null;
  approvalLogs: { statusType: string; remark: string | null; by: string | null; at: string | null }[];
};

const text = (value: any): string => (value === null || value === undefined ? '' : String(value));
const nullableText = (value: any): string | null => {
  const result = text(value).trim();
  return result ? result : null;
};
const number = (value: any): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

/** A server that predates the multi-attachment release only sends `attachment`; fall
 *  back to it so the screen still shows the one file it has. */
const toAttachments = (row: any): InvoiceAttachment[] => {
  const rows = Array.isArray(row?.attachments) ? row.attachments : [];
  if (rows.length > 0) {
    return rows
      .map((item: any) => ({
        id: number(item?.id),
        url: text(item?.url || item?.file_path),
        fileName: nullableText(item?.file_name),
        mimeType: nullableText(item?.mime_type),
        fileSize: number(item?.file_size) || null,
      }))
      .filter((item: InvoiceAttachment) => !!item.url);
  }
  const legacy = nullableText(row?.attachment);
  return legacy ? [{ id: 0, url: legacy, fileName: null, mimeType: null, fileSize: null }] : [];
};

const toListItem = (row: any): InvoiceListItem => ({
  id: number(row?.id),
  invoiceNumber: text(row?.invoice_number),
  invoiceDate: text(row?.invoice_date),
  amount: number(row?.amount),
  points: number(row?.points),
  approvalStatus: number(row?.approval_status),
  statusLabel: text(row?.status_label) || INVOICE_STATUS_LABEL[number(row?.approval_status)] || 'Pending',
  retailerId: number(row?.retailer_id),
  retailerName: text(row?.retailer_name),
  shopName: text(row?.shop_name),
  mobile: text(row?.mobile),
  dealerName: nullableText(row?.dealer_name),
  schemeName: nullableText(row?.scheme_name),
  createdByName: nullableText(row?.created_by_name),
  createdAt: nullableText(row?.created_at),
});

export const invoiceApi = {
  async list(params: { page?: number; pageSize?: number; search?: string; status?: number | null }) {
    const response = await axiosClient.get('api/field/invoices', {
      params: {
        page: params.page || 1,
        page_size: params.pageSize || 10,
        search: params.search?.trim() || undefined,
        approval_status: params.status === null || params.status === undefined ? undefined : params.status,
      },
    });
    const data: any = response.data || {};
    const summary: any = data.summary || {};
    return {
      items: (data.items || []).map(toListItem),
      summary: {
        total: number(summary.total),
        pending: number(summary.pending),
        hold: number(summary.hold),
        approved: number(summary.approved),
        inProcess: number(summary.in_process),
        rejected: number(summary.rejected),
        totalAmount: number(summary.total_amount),
      } as InvoiceSummary,
      total: number(data.pagination?.total),
      // Raising an invoice belongs to the ASR who owns the retailer (and to a
      // superadmin). The server decides; the screen only obeys. Missing on an older
      // server build means no add button, which is the safe way round.
      canCreate: data.can_create === true,
    };
  },

  async detail(id: number): Promise<InvoiceDetail> {
    const response = await axiosClient.get(`api/field/invoices/${id}`);
    const row: any = response.data?.invoice || {};
    return {
      ...toListItem(row),
      approvalRemark: nullableText(row.approval_remark),
      city: nullableText(row.city),
      attachment: nullableText(row.attachment),
      attachments: toAttachments(row),
      canEdit: row.can_edit === true,
      canDelete: row.can_delete === true,
      schemeId: number(row.scheme_id) || null,
      dealerId: number(row.dealer_id) || null,
      approvalLogs: (row.approval_logs || []).map((log: any) => ({
        statusType: text(log?.status_type),
        remark: nullableText(log?.remark),
        by: nullableText(log?.by),
        at: nullableText(log?.at),
      })),
    };
  },

  /**
   * A page of retailers, searched on the server. The full list runs to fourteen thousand
   * rows for a manager, which no phone can draw, so the picker asks for twenty at a time
   * and lets the typing do the narrowing.
   */
  async retailers(search = '', page = 1, pageSize = 20): Promise<{ items: InvoiceRetailer[]; hasMore: boolean }> {
    const response = await axiosClient.get('api/field/invoice-retailers', {
      params: { search: search.trim() || undefined, page, page_size: pageSize },
    });
    return {
      items: (response.data?.retailers || []).map((row: any) => ({
        id: number(row?.id),
        ownerName: text(row?.owner_name),
        shopName: text(row?.shop_name),
        mobile: text(row?.mobile),
        city: nullableText(row?.city),
        address: nullableText(row?.address),
      })),
      hasMore: response.data?.pagination?.has_more === true,
    };
  },

  /** The dealers behind one retailer. One means the form only has to show it. */
  async dealers(retailerId: number): Promise<InvoiceDealer[]> {
    const response = await axiosClient.get('api/field/retailer-dealers', {
      params: { customer_id: retailerId },
    });
    return (response.data?.dealers || []).map((row: any) => ({
      id: number(row?.id),
      name: text(row?.name),
      firmName: text(row?.firm_name) || text(row?.name),
      code: nullableText(row?.code),
    }));
  },

  async schemes(retailerId: number, invoiceDate: string): Promise<InvoiceScheme[]> {
    const response = await axiosClient.get('api/field/invoice-schemes', {
      params: { customer_id: retailerId, invoice_date: invoiceDate },
    });
    return (response.data?.schemes || []).map((row: any) => ({
      id: number(row?.id),
      name: text(row?.name),
      code: nullableText(row?.code),
    }));
  },

  async create(payload: {
    retailerId: number;
    dealerId: number | null;
    schemeId: number | null;
    invoiceNumber: string;
    invoiceDate: string;
    amount: number;
    attachments: { uri: string; name: string; type: string }[];
  }) {
    const form = new FormData();
    form.append('retailer_id', String(payload.retailerId));
    if (payload.dealerId) form.append('dealer_id', String(payload.dealerId));
    if (payload.schemeId) form.append('scheme_id', String(payload.schemeId));
    form.append('invoice_number', payload.invoiceNumber);
    form.append('invoice_date', payload.invoiceDate);
    form.append('amount', String(payload.amount));
    payload.attachments.forEach(file => form.append('attachments', file as any));

    const response = await axiosClient.post('api/field/invoices', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  /** Correcting an invoice nobody has acted on. New files are optional; ids listed in
   *  `removedAttachmentIds` are dropped from the invoice. */
  async update(
    id: number,
    payload: {
      retailerId: number;
      dealerId: number | null;
      schemeId: number | null;
      invoiceNumber: string;
      invoiceDate: string;
      amount: number;
      attachments?: { uri: string; name: string; type: string }[];
      removedAttachmentIds?: number[];
    },
  ) {
    const form = new FormData();
    form.append('retailer_id', String(payload.retailerId));
    if (payload.dealerId) form.append('dealer_id', String(payload.dealerId));
    if (payload.schemeId) form.append('scheme_id', String(payload.schemeId));
    form.append('invoice_number', payload.invoiceNumber);
    form.append('invoice_date', payload.invoiceDate);
    form.append('amount', String(payload.amount));
    (payload.attachments || []).forEach(file => form.append('attachments', file as any));
    (payload.removedAttachmentIds || []).forEach(id => form.append('removed_attachment_ids', String(id)));

    const response = await axiosClient.post(`api/field/invoices/${id}`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  async remove(id: number) {
    const response = await axiosClient.delete(`api/field/invoices/${id}`);
    return response.data;
  },
};
