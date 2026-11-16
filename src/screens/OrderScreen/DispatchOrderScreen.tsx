import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NavigationProp, ParamListBase, useNavigation, useRoute } from '@react-navigation/native';
import Toast from 'react-native-toast-message';
import AppText from '../../components/AppText/AppText';
import { colors } from '../../utils/Colors';
import { rw } from '../../utils/responsive';
import DatePickerModal from '../Loyalty/DatePickerModal';
import {
  DispatchItem,
  DispatchLine,
  DispatchOrder,
  dispatchOrder,
  getOrderForDispatch,
} from '../../api/orderDispatchApi';

type Mode = 'full' | 'partial';

const fmt = (date: Date): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const DispatchOrderScreen = () => {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const route = useRoute();
  const { orderId, mode } = route.params as { orderId: number; mode: Mode };

  const [order, setOrder] = useState<DispatchOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Per-line partial quantity, keyed by order_details.id.
  const [quantities, setQuantities] = useState<Record<number, string>>({});

  const [invoiceNo, setInvoiceNo] = useState('');
  const [invoiceDate, setInvoiceDate] = useState<Date>(new Date());
  const [dispatchDate, setDispatchDate] = useState<Date>(new Date());
  const [lrNo, setLrNo] = useState('');
  const [transport, setTransport] = useState('');
  const [remark, setRemark] = useState('');
  const [showInvoicePicker, setShowInvoicePicker] = useState(false);
  const [showDispatchPicker, setShowDispatchPicker] = useState(false);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId]);

  const load = async () => {
    setLoading(true);
    try {
      const data = await getOrderForDispatch(orderId);
      setOrder(data);
    } catch (e: any) {
      if (!e?.response) {
        Toast.show({ type: 'error', text1: 'Unable to load the order. Please try again.' });
      }
    } finally {
      setLoading(false);
    }
  };

  // Only lines that still have something left to dispatch.
  const pendingLines: DispatchLine[] = useMemo(
    () => (order?.lines ?? []).filter(line => line.remaining > 0),
    [order],
  );

  const setQty = (lineId: number, raw: string, remaining: number) => {
    const digits = raw.replace(/[^0-9]/g, '');
    let value = digits;
    if (digits !== '') {
      const capped = Math.min(Number(digits), remaining);
      value = String(capped);
    }
    setQuantities(prev => ({ ...prev, [lineId]: value }));
  };

  const buildItems = (): DispatchItem[] => {
    if (mode === 'full') {
      return pendingLines.map(line => ({ orderDetailId: line.id, quantity: line.remaining }));
    }
    return pendingLines
      .map(line => ({ orderDetailId: line.id, quantity: Number(quantities[line.id] || 0) }))
      .filter(item => item.quantity > 0);
  };

  const submit = async () => {
    if (!order) return;
    if (!invoiceNo.trim()) {
      Toast.show({ type: 'error', text1: 'Invoice number is required.' });
      return;
    }
    if (dispatchDate < new Date(invoiceDate.getFullYear(), invoiceDate.getMonth(), invoiceDate.getDate())) {
      Toast.show({ type: 'error', text1: 'Dispatch date cannot be before invoice date.' });
      return;
    }
    const items = buildItems();
    if (items.length === 0) {
      Toast.show({
        type: 'error',
        text1:
          mode === 'full'
            ? 'Nothing is left to dispatch on this order.'
            : 'Enter a quantity for at least one product.',
      });
      return;
    }

    setSaving(true);
    try {
      const res = await dispatchOrder(order.id, {
        mode,
        invoiceNo,
        invoiceDate: fmt(invoiceDate),
        dispatchDate: fmt(dispatchDate),
        lrNo,
        transportDetails: transport,
        remark,
        items,
      });
      Toast.show({
        type: 'success',
        text1: res?.message || (mode === 'full' ? 'Order fully dispatched.' : 'Order partially dispatched.'),
      });
      setTimeout(() => navigation.goBack(), 700);
    } catch (e: any) {
      // 400/422 validation messages are surfaced by the axios interceptor; only
      // handle the no-response (network) case here to avoid a duplicate toast.
      if (!e?.response) {
        Toast.show({ type: 'error', text1: 'Unable to connect. Please try again.' });
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={{ flex: 1, justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={colors.navy} />
        </View>
      </SafeAreaView>
    );
  }

  const alreadyDone = order && (order.statusId === 1 || order.statusId === 4);
  const nothingLeft = pendingLines.length === 0;

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={{ padding: rw(18), paddingBottom: 40 }}>
        <View style={styles.modePill}>
          <AppText size={13} family="InterBold" color="white">
            {mode === 'full' ? 'FULLY DISPATCH' : 'PARTIALLY DISPATCH'}
          </AppText>
        </View>

        <View style={{ gap: 4, marginBottom: 14 }}>
          <AppText size={15} family="InterBold" color="black">
            Order : {order?.orderNo || `#${orderId}`}
          </AppText>
          {!!order?.buyerName && (
            <AppText size={13} family="InterRegular" color="#333333">
              Retailer : {order?.buyerName}
            </AppText>
          )}
          {!!order?.sellerName && (
            <AppText size={13} family="InterRegular" color="#333333">
              Distributor : {order?.sellerName}
            </AppText>
          )}
          <AppText size={13} family="InterRegular" color="#333333">
            Status : {order?.statusName}
          </AppText>
        </View>

        {alreadyDone ? (
          <View style={styles.infoBox}>
            <AppText size={14} family="InterSemiBold" color={colors.navy}>
              {order?.statusId === 4
                ? 'This order is cancelled and cannot be dispatched.'
                : 'This order is already fully dispatched.'}
            </AppText>
          </View>
        ) : nothingLeft ? (
          <View style={styles.infoBox}>
            <AppText size={14} family="InterSemiBold" color={colors.navy}>
              Nothing is left to dispatch on this order.
            </AppText>
          </View>
        ) : (
          <>
            {/* Products */}
            <View style={styles.card}>
              <View style={styles.lineHead}>
                <AppText size={13} family="InterSemiBold" color="black" width="44%">
                  Product
                </AppText>
                <AppText size={13} family="InterSemiBold" color="black" width="18%" align="center">
                  Order
                </AppText>
                <AppText size={13} family="InterSemiBold" color="black" width="18%" align="center">
                  Shipped
                </AppText>
                <AppText size={13} family="InterSemiBold" color="black" width="20%" align="center">
                  {mode === 'full' ? 'Dispatch' : 'Qty'}
                </AppText>
              </View>
              {pendingLines.map(line => (
                <View key={line.id} style={styles.lineRow}>
                  <View style={{ width: '44%' }}>
                    <AppText size={13} family="InterRegular" color="#333333">
                      {line.productName}
                    </AppText>
                    <AppText size={11} family="InterRegular" color={colors.gray}>
                      Remaining: {line.remaining}
                    </AppText>
                  </View>
                  <AppText size={13} family="InterRegular" color="#333333" width="18%" align="center">
                    {line.quantity}
                  </AppText>
                  <AppText size={13} family="InterRegular" color="#333333" width="18%" align="center">
                    {line.shippedQty}
                  </AppText>
                  <View style={{ width: '20%', alignItems: 'center' }}>
                    {mode === 'full' ? (
                      <AppText size={14} family="InterBold" color={colors.navy}>
                        {line.remaining}
                      </AppText>
                    ) : (
                      <TextInput
                        style={styles.qtyInput}
                        keyboardType="number-pad"
                        value={quantities[line.id] ?? ''}
                        placeholder="0"
                        placeholderTextColor="#B9C0CC"
                        onChangeText={text => setQty(line.id, text, line.remaining)}
                      />
                    )}
                  </View>
                </View>
              ))}
            </View>

            {/* Dispatch details */}
            <View style={styles.card}>
              <AppText size={14} family="InterBold" color="black" style={{ marginBottom: 8 }}>
                Dispatch Details
              </AppText>

              <Field label="Invoice Number *">
                <TextInput
                  style={styles.input}
                  value={invoiceNo}
                  placeholder="Enter invoice number"
                  placeholderTextColor="#B9C0CC"
                  onChangeText={setInvoiceNo}
                />
              </Field>

              <Field label="Invoice Date *">
                <Pressable style={styles.input} onPress={() => setShowInvoicePicker(true)}>
                  <AppText size={14} family="InterRegular" color="black">
                    {fmt(invoiceDate)}
                  </AppText>
                </Pressable>
              </Field>

              <Field label="Dispatch Date *">
                <Pressable style={styles.input} onPress={() => setShowDispatchPicker(true)}>
                  <AppText size={14} family="InterRegular" color="black">
                    {fmt(dispatchDate)}
                  </AppText>
                </Pressable>
              </Field>

              <Field label="LR Number">
                <TextInput
                  style={styles.input}
                  value={lrNo}
                  placeholder="Enter LR number"
                  placeholderTextColor="#B9C0CC"
                  onChangeText={setLrNo}
                />
              </Field>

              <Field label="Transport Details">
                <TextInput
                  style={styles.input}
                  value={transport}
                  placeholder="Enter transport details"
                  placeholderTextColor="#B9C0CC"
                  onChangeText={setTransport}
                />
              </Field>

              <Field label="Remark">
                <TextInput
                  style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
                  value={remark}
                  multiline
                  placeholder="Enter remark"
                  placeholderTextColor="#B9C0CC"
                  onChangeText={setRemark}
                />
              </Field>
            </View>

            <Pressable
              style={[styles.submit, saving && { opacity: 0.6 }]}
              disabled={saving}
              onPress={submit}>
              {saving ? (
                <ActivityIndicator color="white" />
              ) : (
                <AppText size={16} family="InterBold" color="white">
                  {mode === 'full' ? 'Fully Dispatch' : 'Partially Dispatch'}
                </AppText>
              )}
            </Pressable>
          </>
        )}
      </ScrollView>

      <DatePickerModal
        visible={showInvoicePicker}
        value={invoiceDate}
        title="Invoice date"
        onSelect={setInvoiceDate}
        onClose={() => setShowInvoicePicker(false)}
      />
      <DatePickerModal
        visible={showDispatchPicker}
        value={dispatchDate}
        title="Dispatch date"
        onSelect={setDispatchDate}
        onClose={() => setShowDispatchPicker(false)}
      />
    </SafeAreaView>
  );
};

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <View style={{ marginBottom: 12 }}>
    <AppText size={12.5} family="InterSemiBold" color="#4A5568" style={{ marginBottom: 6 }}>
      {label}
    </AppText>
    {children}
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F6F8' },
  modePill: {
    alignSelf: 'flex-start',
    backgroundColor: colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 12,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#ECECEC',
  },
  lineHead: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
    marginBottom: 8,
  },
  lineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#F0F0F0',
  },
  qtyInput: {
    width: '100%',
    height: 40,
    borderWidth: 1,
    borderColor: '#D5DBE3',
    borderRadius: 8,
    textAlign: 'center',
    paddingVertical: 0,
    color: colors.black,
    backgroundColor: '#fff',
  },
  input: {
    minHeight: 46,
    borderWidth: 1,
    borderColor: '#D5DBE3',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: colors.black,
    backgroundColor: '#fff',
    justifyContent: 'center',
  },
  infoBox: {
    backgroundColor: '#FAF0DD',
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
  },
  submit: {
    backgroundColor: colors.primary,
    height: 50,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 6,
  },
});

export default DispatchOrderScreen;
