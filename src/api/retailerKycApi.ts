import axiosClient from './AxiosClient';
import { API_ENDPOINT } from './ApiUrls';
import { normalizeBankAccountType } from '../utils/bankAccountType';

/**
 * A retailer's KYC, as the Loyalty tab's KYC screen reads and saves it. It is the very same
 * payload the VRiDDHi dealer login uses - only the path differs, and the server resolves the
 * retailer from this user's data scope (admin all, BM branch, others their downline).
 */
export type KycDocKey = 'gst' | 'pan' | 'aadhar' | 'bank';

export type KycFile = { uri: string; name: string; type: string };

export type KycDocument = {
  key: KycDocKey;
  title: string;
  attachmentUrl: string;
  status: 'approved' | 'rejected' | 'pending';
  statusLabel: string;
  remark: string;
  actionBy: string;
  actionAt: string;
};

export type KycDetails = {
  summary: { uploaded: number; approved: number; status: string };
  gstNumber: string;
  panNumber: string;
  aadharNo: string;
  bankAccountType: string;
  bankName: string;
  bankAccountNumber: string;
  ifscCode: string;
  accountHolderName: string;
  documents: KycDocument[];
};

export type KycFieldKey = Exclude<keyof KycDetails, 'summary' | 'documents'>;

const TITLES: Record<KycDocKey, string> = { gst: 'GST Certificate', pan: 'PAN Card', aadhar: 'Aadhaar Card', bank: 'Bank Proof' };
const FILE_FIELDS: Record<KycDocKey, string> = { gst: 'gst_attachment', pan: 'pan_attachment', aadhar: 'aadhar_attachment', bank: 'bank_proof' };

const text = (value: unknown) => (value === null || value === undefined ? '' : String(value).trim());

const statusOf = (value: unknown): KycDocument['status'] => {
  const raw = text(value).toLowerCase();
  if (raw.startsWith('approve') || raw === 'verified') return 'approved';
  if (raw.startsWith('reject')) return 'rejected';
  return 'pending';
};

const read = (raw: any): KycDetails => {
  const source = raw?.data ?? {};
  const fields = source.fields ?? {};
  const docs: any[] = Array.isArray(source.documents) ? source.documents : [];
  return {
    summary: {
      uploaded: Number(source.summary?.uploaded ?? 0),
      approved: Number(source.summary?.approved ?? 0),
      status: text(source.summary?.status) || 'missing',
    },
    gstNumber: text(fields.gst_number),
    panNumber: text(fields.pan_number),
    aadharNo: text(fields.aadhar_no),
    bankAccountType: normalizeBankAccountType(fields.bank_account_type),
    bankName: text(fields.bank_name),
    bankAccountNumber: text(fields.bank_account_number),
    ifscCode: text(fields.ifsc_code),
    accountHolderName: text(fields.account_holder_name),
    documents: (['gst', 'pan', 'aadhar', 'bank'] as KycDocKey[]).map(key => {
      const doc = docs.find(item => item?.key === key) ?? {};
      const status = statusOf(doc.status);
      return {
        key,
        title: TITLES[key],
        attachmentUrl: text(doc.attachment_url),
        status,
        statusLabel: status === 'approved' ? 'Approved' : status === 'rejected' ? 'Rejected' : 'Pending',
        remark: text(doc.remark),
        actionBy: text(doc.action_by),
        actionAt: text(doc.action_at),
      };
    }),
  };
};

const path = (retailerId: number | string) => `api/sfa/retailers/${retailerId}/kyc`;

export const retailerKycApi = {
  async get(retailerId: number | string): Promise<KycDetails> {
    const { data } = await axiosClient.get(path(retailerId));
    return read(data);
  },

  /** Sends every number and any new file. The server skips whatever belongs to an approved
   *  document, and puts anything changed back into review. */
  async update(retailerId: number | string, kyc: KycDetails, files: Partial<Record<KycDocKey, KycFile>>): Promise<KycDetails> {
    const form = new FormData();
    form.append('gst_number', kyc.gstNumber);
    form.append('pan_number', kyc.panNumber);
    form.append('aadhar_no', kyc.aadharNo);
    form.append('bank_account_type', kyc.bankAccountType);
    form.append('bank_name', kyc.bankName);
    form.append('bank_account_number', kyc.bankAccountNumber);
    form.append('ifsc_code', kyc.ifscCode);
    form.append('account_holder_name', kyc.accountHolderName);
    (Object.keys(files) as KycDocKey[]).forEach(key => {
      const file = files[key];
      if (file?.uri) form.append(FILE_FIELDS[key], { uri: file.uri, name: file.name, type: file.type } as any);
    });
    const { data } = await axiosClient.put(path(retailerId), form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return read(data);
  },
};

/** The active-retailer list the KYC tab shows: the field app's retailer listing, narrowed to
 *  retailers with at least one loyalty invoice. */
export const listActiveRetailers = async (params: { page: number; search: string; kyc: string | null }) => {
  const { data } = await axiosClient.get(API_ENDPOINT.SECONDARY_CUSTOMER, {
    params: {
      type: 'RETAILER',
      invoice_active: 1,
      page: params.page,
      global_search: params.search.trim() || undefined,
      kyc: params.kyc || undefined,
    },
  });
  const page = data?.data ?? {};
  return { items: (page.data ?? []) as any[], total: Number(page.total ?? 0) };
};

export const kycSummary = async (): Promise<Record<string, number>> => {
  const { data } = await axiosClient.get(`${API_ENDPOINT.SECONDARY_CUSTOMER}/kyc-summary`, {
    params: { type: 'RETAILER', invoice_active: 1 },
  });
  return data?.data ?? {};
};
