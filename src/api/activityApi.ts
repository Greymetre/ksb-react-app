import axiosClient from './AxiosClient';

export type ActivityType = 'nukkad' | 'retailer' | 'farmer' | 'influencer';

export const normalizeActivity = (row: any) => ({
  ...row,
  activityCode: row?.activityCode ?? row?.activity_code ?? '',
  activityType: row?.activityType ?? row?.activity_type ?? '',
  activityName: row?.activityName ?? row?.activity_name ?? '',
  activityDate: row?.activityDate ?? row?.activity_date ?? '',
  userId: row?.userId ?? row?.user_id ?? null,
  branchId: row?.branchId ?? row?.branch_id ?? row?.branch ?? null,
  reportingManagerId: row?.reportingManagerId ?? row?.reporting_manager_id ?? null,
  distributorId: row?.distributorId ?? row?.distributor_id ?? null,
  distributorName: row?.distributorName ?? row?.distributor_name ?? '',
  dealerName: row?.dealerName ?? row?.dealer_name ?? '',
  hotelName: row?.hotelName ?? row?.hotel_name ?? '',
  locationLat: row?.locationLat ?? row?.location_lat ?? null,
  locationLng: row?.locationLng ?? row?.location_lng ?? null,
  locationText: row?.locationText ?? row?.location_text ?? '',
  giftCount: row?.giftCount ?? row?.gift_count ?? 0,
  totalExpense: row?.totalExpense ?? row?.total_expense ?? 0,
  participants: (row?.participants || []).map((item: any) => ({
    ...item,
    shopName: item?.shopName ?? item?.shop_name ?? '',
    proprietorName: item?.proprietorName ?? item?.proprietor_name ?? '',
    participantType: item?.participantType ?? item?.participant_type ?? '',
    giftName: item?.giftName ?? item?.gift_name ?? '',
    isInfluencer: item?.isInfluencer ?? item?.is_influencer ?? false,
    socialType: item?.socialType ?? item?.social_type ?? '',
    socialLink: item?.socialLink ?? item?.social_link ?? '',
  })),
  expenses: (row?.expenses || []).map((item: any) => ({
    ...item,
    expenseType: item?.expenseType ?? item?.expense_type ?? '',
    totalAmount: item?.totalAmount ?? item?.total_amount ?? '',
    dealerShareAmount: item?.dealerShareAmount ?? item?.dealer_share_amount ?? '',
    invoiceUrl: item?.invoiceUrl ?? item?.invoice_url ?? '',
  })),
  photos: (row?.photos || []).map((item: any) => ({
    ...item,
    photoUrl: item?.photoUrl ?? item?.photo_url ?? '',
    takenAt: item?.takenAt ?? item?.taken_at ?? null,
  })),
});
export const activityApi = {
  list: (page = 1, filters: Record<string, any> = {}) =>
    axiosClient.get('api/activities', {
      params: { page, per_page: 20, ...filters },
    }),
  config: (type: ActivityType) =>
    axiosClient.get(`api/activities/config/${type}`),
  filters: () => axiosClient.get('api/activities/filters'),
  dashboardSummary: (dateRange: 'today' | 'month' | 'year') =>
    axiosClient.get('api/activities/dashboard-summary', {params: {date_range: dateRange}}),
  summary: (params: Record<string, any>) => axiosClient.get('api/reports/all-meeting-summary', {params}),
  searchDistributors: (q: string, userId: number) =>
    axiosClient.get('api/distributors/search', { params: { q, user: userId } }),
  distributorRetailers: (distributorId: number) =>
    axiosClient.get(`api/distributors/${distributorId}/retailers`),
  detail: (id: number) => axiosClient.get(`api/activities/${id}`),
  create: (payload: any) => axiosClient.post('api/activities', payload),
  update: (id: number, payload: any) =>
    axiosClient.put(`api/activities/${id}`, payload),
  submit: (id: number) => axiosClient.post(`api/activities/${id}/submit`),
  upload: (asset: any) => {
    const body = new FormData();
    body.append('file', {
      uri: asset.path || asset.uri,
      name: asset.filename || `activity-${Date.now()}.jpg`,
      type: asset.mime || asset.type || 'image/jpeg',
    } as any);
    return axiosClient.post('api/activities/upload', body, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};
