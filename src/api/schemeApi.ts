import axiosClient from './AxiosClient';

/**
 * Loyalty schemes as the field app sees them.
 *
 * A scheme is built for a customer type and an area - everywhere, a branch, a zone, a
 * state, or named customers - so the API returns the ones any of this user's retailers
 * would qualify for. Somebody working Patna does not see a scheme written for Indore.
 */

export type SchemeStatus = 'live' | 'upcoming' | 'expired';

export const SCHEME_TONE: Record<SchemeStatus, { text: string; background: string; accent: string }> = {
  live: { text: '#15803D', background: '#DCFCE7', accent: '#16A34A' },
  upcoming: { text: '#1D4ED8', background: '#DBEAFE', accent: '#2563EB' },
  expired: { text: '#6B7280', background: '#F1F5F9', accent: '#94A3B8' },
};

export type SchemeCard = {
  id: number;
  name: string;
  code: string | null;
  walletType: string;
  basedOn: string | null;
  startDate: string;
  endDate: string;
  status: SchemeStatus;
  statusLabel: string;
  isLive: boolean;
  daysRemaining: number;
  areaScope: string | null;
  areaValues: string[];
  customerType: string | null;
  slabCount: number;
};

export type SchemeSlab = { fromAmount: number; toAmount: number; value: number; valueType: string | null };

export type SchemeDetail = {
  scheme: SchemeCard;
  slabs: SchemeSlab[];
  performance: {
    invoiceCount: number;
    retailerCount: number;
    approvedAmount: number;
    pendingAmount: number;
    pointsEarned: number;
    pointsExpected: number;
  };
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

const toCard = (row: any): SchemeCard => {
  const status = text(row?.status).toLowerCase();
  return {
    id: number(row?.id),
    name: text(row?.name),
    code: nullableText(row?.code),
    walletType: text(row?.wallet_type) || 'Regular',
    basedOn: nullableText(row?.based_on),
    startDate: text(row?.start_date),
    endDate: text(row?.end_date),
    status: status === 'expired' || status === 'upcoming' ? (status as SchemeStatus) : 'live',
    statusLabel: text(row?.status_label) || 'Live',
    isLive: row?.is_live === true,
    daysRemaining: number(row?.days_remaining),
    areaScope: nullableText(row?.area_scope),
    areaValues: Array.isArray(row?.area_values) ? row.area_values.map(text) : [],
    customerType: nullableText(row?.customer_type),
    slabCount: number(row?.slab_count),
  };
};

export const schemeApi = {
  async list(): Promise<SchemeCard[]> {
    const response = await axiosClient.get('api/field/schemes');
    return (response.data?.schemes || []).map(toCard);
  },

  async detail(id: number): Promise<SchemeDetail> {
    const response = await axiosClient.get(`api/field/schemes/${id}`);
    const data: any = response.data || {};
    const performance: any = data.performance || {};
    return {
      scheme: toCard(data.scheme || {}),
      slabs: (data.slabs || []).map((slab: any) => ({
        fromAmount: number(slab?.from_amount),
        toAmount: number(slab?.to_amount),
        value: number(slab?.value),
        valueType: nullableText(slab?.value_type),
      })),
      performance: {
        invoiceCount: number(performance.invoice_count),
        retailerCount: number(performance.retailer_count),
        approvedAmount: number(performance.approved_amount),
        pendingAmount: number(performance.pending_amount),
        pointsEarned: number(performance.points_earned),
        pointsExpected: number(performance.points_expected),
      },
    };
  },
};
