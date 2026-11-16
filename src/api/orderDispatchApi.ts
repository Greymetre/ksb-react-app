import axiosClient from './AxiosClient';

/**
 * Order dispatch (full / partial) for the SFA app. These hit the same CRM
 * endpoints the web uses:
 *   GET  api/orders/{id}            -> order header + lines with shipped_qty + status
 *   POST api/orders/{id}/dispatch   -> multipart; creates a Sale (dispatch) record,
 *                                      bumps each line's shipped_qty and the order status.
 * Status ids: null = Pending, 1 = Fully Dispatched, 2 = Partially Dispatched, 4 = Cancelled.
 */

export interface DispatchLine {
  id: number; // order_details.id
  productId: number | null;
  productName: string;
  quantity: number; // ordered qty
  shippedQty: number; // already dispatched
  remaining: number; // quantity - shippedQty
  price: number;
  lineTotal: number;
  statusId: number | null;
  statusName: string;
}

export interface DispatchOrder {
  id: number;
  orderNo: string;
  statusId: number | null; // null Pending, 1 Full, 2 Partial, 4 Cancelled
  statusName: string;
  buyerName: string;
  sellerName: string;
  orderDate: string;
  lines: DispatchLine[];
}

const num = (value: unknown): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const normalizeLine = (raw: any): DispatchLine => {
  const quantity = num(raw?.quantity);
  const shippedQty = num(raw?.shipped_qty ?? raw?.shippedQty);
  return {
    id: num(raw?.id),
    productId: raw?.product_id != null ? num(raw.product_id) : null,
    productName: String(raw?.product_name ?? raw?.productName ?? 'Product'),
    quantity,
    shippedQty,
    remaining: Math.max(0, quantity - shippedQty),
    price: num(raw?.price),
    lineTotal: num(raw?.line_total ?? raw?.lineTotal),
    statusId: raw?.status_id != null ? num(raw.status_id) : null,
    statusName: String(raw?.status_name ?? raw?.statusName ?? 'Pending'),
  };
};

export const getOrderForDispatch = async (orderId: number): Promise<DispatchOrder> => {
  const { data } = await axiosClient.get(`api/orders/${orderId}`);
  const order = data?.order ?? data?.data?.order ?? {};
  const rawLines: any[] = data?.order_details ?? data?.orderDetails ?? data?.data?.order_details ?? [];
  return {
    id: num(order?.id ?? orderId),
    orderNo: String(order?.orderno ?? order?.orderNo ?? ''),
    statusId: order?.status_id != null ? num(order.status_id) : order?.statusId != null ? num(order.statusId) : null,
    statusName: String(order?.status_name ?? order?.statusName ?? 'Pending'),
    buyerName: String(order?.buyer_name ?? order?.buyerName ?? ''),
    sellerName: String(order?.seller_name ?? order?.sellerName ?? ''),
    orderDate: String(order?.order_date ?? order?.orderDate ?? ''),
    lines: rawLines.map(normalizeLine),
  };
};

export interface DispatchItem {
  orderDetailId: number;
  quantity: number;
}

export interface DispatchPayload {
  mode: 'full' | 'partial';
  invoiceNo: string;
  invoiceDate: string; // YYYY-MM-DD
  dispatchDate: string; // YYYY-MM-DD
  lrNo?: string;
  transportDetails?: string;
  remark?: string;
  items: DispatchItem[];
}

export const dispatchOrder = async (orderId: number, payload: DispatchPayload) => {
  const form = new FormData();
  form.append('mode', payload.mode);
  form.append('invoice_no', payload.invoiceNo.trim());
  form.append('invoice_date', payload.invoiceDate);
  form.append('dispatch_date', payload.dispatchDate);
  form.append('lr_no', payload.lrNo?.trim() ?? '');
  form.append('transport_details', payload.transportDetails?.trim() ?? '');
  form.append('remark', payload.remark?.trim() ?? '');
  form.append('removed_order_detail_ids', '[]');
  // The server reads `items` as a JSON string of { orderDetailId, quantity }.
  form.append(
    'items',
    JSON.stringify(payload.items.map(i => ({ orderDetailId: i.orderDetailId, quantity: i.quantity }))),
  );

  const { data } = await axiosClient.post(`api/orders/${orderId}/dispatch`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
};
