import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { createMMKV } from 'react-native-mmkv';
import { activityApi, ActivityType, normalizeActivity } from '../../api/activityApi';
import { resolveMediaUrl } from '../../api/AxiosClient';

const offline = createMMKV({ id: 'promotional-activity-drafts' });
const today = () => new Date().toISOString().slice(0, 10);
const GIFT_OPTIONS = ['T-Shirt', 'Cap', 'Tool Kit', 'Bag'];
const FORM_SECTIONS = [
  { id: 1, label: 'Details' },
  { id: 2, label: 'People' },
  { id: 3, label: 'Gifts' },
  { id: 4, label: 'Expense' },
  { id: 5, label: 'Photos' },
  { id: 6, label: 'Feedback' },
];
const SOCIAL_TYPES = ['Instagram', 'Facebook', 'LinkedIn', 'YouTube'];

const emptyParticipant = () => ({
  name: '',
  shopName: '',
  proprietorName: '',
  participantType: '',
  profession: '',
  mobile: '',
  giftName: '',
  remarks: '',
  isInfluencer: false,
  socialType: '',
  socialLink: '',
});
export default function ActivityFormScreen() {
  const nav: any = useNavigation(),
    route: any = useRoute();
  const { id, type, readOnly } = route.params as {
    id?: number;
    type: ActivityType;
    readOnly?: boolean;
  };
  const [loading, setLoading] = useState(true),
    [saving, setSaving] = useState(false),
    [cfg, setCfg] = useState<any>(),
    [dateOpen, setDateOpen] = useState(false),
    [distOpen, setDistOpen] = useState(false),
    [dealerOpen, setDealerOpen] = useState(false),
    [userOpen, setUserOpen] = useState(false),
    [userQuery, setUserQuery] = useState(''),
    [giftParticipantIndex, setGiftParticipantIndex] = useState<number | null>(null),
    [distQuery, setDistQuery] = useState(''),
    [distRows, setDistRows] = useState<any[]>([]),
    [dealerRows, setDealerRows] = useState<any[]>([]);
  const [form, setForm] = useState<any>({
    activityCode: '',
    activityType: type,
    activityName: '',
    activityDate: today(),
    userId: null,
    userName: '',
    branchId: null,
    zone: '',
    reportingManagerId: null,
    reportingManagerName: '',
    distributorId: null,
    distributorName: '',
    dealerName: '',
    hotelName: '',
    locationText: '',
    locationLat: null,
    locationLng: null,
    giftCount: 0,
    feedback: '',
    participants: [emptyParticipant()],
    expenses: [],
    photos: [],
  });
  const formScrollRef = useRef<ScrollView>(null);
  const chipScrollRef = useRef<ScrollView>(null);
  const sectionOffsets = useRef<Record<number, number>>({});
  const [activeSection, setActiveSection] = useState(1);
  const filteredAsrDsrUsers = useMemo(() => {
    const query = userQuery.trim().toLowerCase();
    const users = cfg?.asr_dsr_users || [];
    if (!query) return users;
    return users.filter((user: any) =>
      [user.name, user.designation_name, user.employee_code, user.employee_codes]
        .filter(Boolean)
        .some(value => String(value).toLowerCase().includes(query)),
    );
  }, [cfg?.asr_dsr_users, userQuery]);

  const scrollToSection = (sectionId: number) => {
    setActiveSection(sectionId);
    formScrollRef.current?.scrollTo({
      y: Math.max(0, (sectionOffsets.current[sectionId] || 0) - 10),
      animated: true,
    });
  };

  const syncSectionFromScroll = (
    offsetY: number,
    viewportHeight: number,
    contentHeight: number,
  ) => {
    const marker = offsetY + 36;
    let current = 1;
    for (const section of FORM_SECTIONS) {
      const top = sectionOffsets.current[section.id];
      if (typeof top === 'number' && marker >= top) current = section.id;
    }
    if (offsetY + viewportHeight >= contentHeight - 12) current = 6;
    if (current !== activeSection) setActiveSection(current);
  };

  useEffect(() => {
    chipScrollRef.current?.scrollTo({
      x: Math.max(0, (activeSection - 1) * 92 - 70),
      animated: true,
    });
  }, [activeSection]);
  useEffect(() => {
    (async () => {
      try {
        const c = (await activityApi.config(type)).data.data;
        setCfg(c);
        const byKey = (k: string) =>
          c.fields?.find(
            (f: any) => String(f.key).toLowerCase() === k.toLowerCase(),
          );
        const defaultValue = (k: string) => {
          const field = byKey(k);
          return field?.default_value ?? field?.defaultValue;
        };
        let next: any;
        if (id) {
          next = normalizeActivity((await activityApi.detail(id)).data.data);
          const assignedUser = (c.asr_dsr_users || []).find(
            (user: any) => Number(user.id) === Number(next.userId),
          );
          next.userName = assignedUser?.name || next.userName || '';
        }
        else {
          const cached = offline.getString(`activity-${type}`);
          if (cached) next = JSON.parse(cached);
        }
        const defaults = {
          activityName: defaultValue('activityName') || '',
          activityDate: defaultValue('activityDate') || today(),
          zone: defaultValue('branchZone') || '',
          branchId: byKey('branchZone')?.metadata?.branch_id || null,
          reportingManagerName: defaultValue('reportingManager') || '',
          reportingManagerId:
            byKey('reportingManager')?.metadata?.reporting_manager_id || null,
          userName: defaultValue('userId') || '',
          participants: [
            {
              ...emptyParticipant(),
              profession: type === 'farmer' ? 'Farmer' : '',
            },
          ],
        };
        const forcedAuto = {
          activityName:
            type === 'farmer'
              ? next?.activityName || defaults.activityName
              : defaults.activityName,
          zone: defaults.zone,
          branchId: defaults.branchId,
          reportingManagerName: defaults.reportingManagerName,
          reportingManagerId: defaults.reportingManagerId,
          ...(c.asr_auto
            ? { userId: c.current_user_id, userName: defaults.userName }
            : {}),
        };
        if (next)
          setForm((x: any) => ({
            ...x,
            ...defaults,
            ...next,
            ...forcedAuto,
            participants: next.participants?.length
              ? next.participants
              : defaults.participants,
            expenses: next.expenses?.length
              ? next.expenses
              : c.expense_types.map((expenseType: string) => ({
                  expenseType,
                  totalAmount: '',
                  dealerShareAmount: '',
                  remarks: '',
                  invoiceUrl: '',
                })),
          }));
        else
          setForm((x: any) => ({
            ...x,
            ...defaults,
            ...forcedAuto,
            expenses: c.expense_types.map((expenseType: string) => ({
              expenseType,
              totalAmount: '',
              dealerShareAmount: '',
              remarks: '',
              invoiceUrl: '',
            })),
          }));
      } finally {
        setLoading(false);
      }
    })();
  }, [id, type]);
  useEffect(() => {
    if (!distOpen || !form.userId) {
      setDistRows([]);
      return;
    }
    const timer = setTimeout(
      () =>
        activityApi
          .searchDistributors(distQuery, Number(form.userId))
          .then(r => setDistRows(r.data?.data || []))
          .catch(() => setDistRows([])),
      300,
    );
    return () => clearTimeout(timer);
  }, [distQuery, distOpen, form.userId]);
  useEffect(() => {
    if (!form.distributorId) {
      setDealerRows([]);
      return;
    }
    activityApi
      .distributorRetailers(form.distributorId)
      .then(response => setDealerRows(response.data?.data || []))
      .catch((error: any) => {
        setDealerRows([]);
        Alert.alert(
          'Unable to load Sub Dealers',
          error?.response?.data?.message ||
            'Please try selecting the distributor again.',
        );
      });
  }, [form.distributorId]);
  const set = (key: string, value: any) =>
    !readOnly && setForm((x: any) => ({ ...x, [key]: value }));
  const participant = (i: number, key: string, value: any) =>
    setForm((x: any) => ({
      ...x,
      participants: x.participants.map((p: any, n: number) =>
        n === i ? { ...p, [key]: value } : p,
      ),
    }));
  const expense = (i: number, key: string, value: any) =>
    setForm((x: any) => ({
      ...x,
      expenses: x.expenses.map((p: any, n: number) =>
        n === i ? { ...p, [key]: value } : p,
      ),
    }));
  const total = useMemo(
    () =>
      form.expenses.reduce(
        (a: number, x: any) => a + Number(x.totalAmount || 0),
        0,
      ),
    [form.expenses],
  );
  const dealerTotal = useMemo(
    () =>
      form.expenses.reduce(
        (a: number, x: any) => a + Number(x.dealerShareAmount || 0),
        0,
      ),
    [form.expenses],
  );
  const validateSubmit = () => {
    if (!form.activityDate) return 'Activity Date is required.';
    if (!String(form.activityName || '').trim())
      return 'Activity Name is required.';
    if (!form.branchId || !String(form.zone || '').trim())
      return 'Branch & Zone is required.';
    if (
      !form.reportingManagerId ||
      !String(form.reportingManagerName || '').trim()
    )
      return 'Reporting Manager is required.';
    if (!form.userId || !String(form.userName || '').trim())
      return 'ASR / DSR Name is required.';
    if (!form.distributorId) return 'Distributor Code & Name is required.';
    if (cfg.hotel && !String(form.hotelName || '').trim())
      return 'Hotel Name is required.';
    if (!String(form.locationText || '').trim())
      return 'Activity Location is required.';
    for (let i = 0; i < form.participants.length; i++) {
      const p = form.participants[i];
      if (
        cfg.shop_mode
          ? !String(p.shopName || '').trim()
          : !String(p.name || '').trim()
      )
        return `${
          cfg.shop_mode ? 'Retailer Shop Name' : 'Participant Name'
        } is required for row ${i + 1}.`;
      if (p.mobile && !/^\d{10}$/.test(p.mobile))
        return `Mobile in row ${i + 1} must contain exactly 10 digits.`;
      if (p.isInfluencer && !String(p.socialType || '').trim())
        return `Social Media Type is required for row ${i + 1}.`;
    }
    for (const x of form.expenses) {
      if (x.totalAmount === '' || x.totalAmount == null)
        return `Total Exp is required for ${x.expenseType}.`;
      if (
        ['hotel', 'other', 'other1', 'other2'].includes(x.expenseType) &&
        !String(x.remarks || '').trim()
      )
        return `Remarks are required for ${x.expenseType}.`;
    }
    return null;
  };
  const save = async (submit = false) => {
    const validation = submit ? validateSubmit() : null;
    if (validation) return Alert.alert('Required fields', validation);
    setSaving(true);
    try {
      const payload = {
        activity_type: form.activityType,
        activity_name: form.activityName,
        activity_date: form.activityDate,
        user_id: form.userId,
        branch_id: form.branchId,
        zone: form.zone,
        reporting_manager_id: form.reportingManagerId,
        distributor_id: form.distributorId,
        distributor_name: form.distributorName,
        dealer_name: form.dealerName,
        hotel_name: form.hotelName,
        location_lat: form.locationLat,
        location_lng: form.locationLng,
        location_text: form.locationText,
        gift_count: Number(form.giftCount || 0),
        feedback: form.feedback,
        participants: form.participants.map((p: any) => ({
          name: p.name,
          shop_name: p.shopName,
          proprietor_name: p.proprietorName,
          profession: p.profession,
          mobile: p.mobile,
          participant_type: p.participantType,
          gift_name: p.giftName,
          remarks: p.remarks,
          is_influencer: Boolean(p.isInfluencer),
          social_type: p.socialType,
          social_link: p.socialLink,
        })),
        expenses: form.expenses.map((x: any) => ({
          expense_type: x.expenseType,
          total_amount: Number(x.totalAmount || 0),
          dealer_share_amount: Number(x.dealerShareAmount || 0),
          remarks: x.remarks,
          invoice_url: x.invoiceUrl,
        })),
        photos: form.photos.map((p: any) => ({
          photo_url: p.photoUrl,
          latitude: Number(p.latitude || 0),
          longitude: Number(p.longitude || 0),
          taken_at: p.takenAt,
        })),
      };
      const res = id
        ? await activityApi.update(id, payload)
        : await activityApi.create(payload);
      const activityId = id || res.data.data.id;
      // The backend generates the readable activity id on create, so keep it on the
      // form and show it in the header instead of the placeholder.
      const activityCode = res?.data?.data?.activityCode ?? res?.data?.data?.activity_code;
      if (activityCode) setForm((x: any) => ({ ...x, activityCode }));
      offline.remove(`activity-${type}`);
      if (submit) await activityApi.submit(activityId);
      Alert.alert(
        'Success',
        submit
          ? 'Activity submitted successfully.'
          : 'Draft saved successfully.',
        [{ text: 'OK', onPress: () => nav.goBack() }],
      );
    } catch (e: any) {
      offline.set(`activity-${type}`, JSON.stringify(form));
      Alert.alert(
        e?.response ? 'Unable to save' : 'Saved offline',
        e?.response?.data?.message ||
          'Draft is saved on this device and can be submitted when online.',
      );
    } finally {
      setSaving(false);
    }
  };
  const handlePhotoResult = async (result: any) => {
    if (result.didCancel) return;
    if (result.errorCode) {
      Alert.alert(
        'Photo unavailable',
        result.errorMessage || 'Unable to open the selected photo source.',
      );
      return;
    }
    const asset = result.assets?.[0];
    if (!asset) return;
    try {
      const uploaded = (await activityApi.upload(asset)).data.data.url;
      setForm((current: any) => ({
        ...current,
        photos: [
          ...current.photos,
          {
            photoUrl: uploaded,
            latitude: Number(current.locationLat || 0),
            longitude: Number(current.locationLng || 0),
            takenAt: new Date().toISOString(),
            preview: asset.uri,
          },
        ],
      }));
    } catch {
      Alert.alert('Upload failed', 'Please check internet and try again.');
    }
  };
  const addPhoto = () =>
    Alert.alert('Add activity photo', 'Choose photo source', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Gallery',
        onPress: () =>
          launchImageLibrary(
            { mediaType: 'photo', quality: 0.8, selectionLimit: 1 },
            handlePhotoResult,
          ),
      },
      {
        text: 'Camera',
        onPress: () =>
          launchCamera(
            { mediaType: 'photo', quality: 0.8, saveToPhotos: false },
            handlePhotoResult,
          ),
      },
    ]);
  if (loading || !cfg)
    return <ActivityIndicator style={{ flex: 1 }} color="#3b4db7" />;
  return (
    <SafeAreaView style={s.page}>
      <View style={s.header}>
        <Pressable onPress={() => nav.goBack()}>
          <Text style={s.back}>‹</Text>
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={s.mini}>
            {form.activityCode ? form.activityCode : 'FIELDKONNECT'}
          </Text>
          <Text style={s.title}>
            {readOnly ? 'View' : 'New'} {cfg.title}
          </Text>
        </View>
        <Text style={s.status}>{readOnly ? 'Submitted' : 'Draft'}</Text>
      </View>
      <View style={s.chipBar}>
        <ScrollView
          ref={chipScrollRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.chipRow}
        >
          {FORM_SECTIONS.map(section => {
            const selected = activeSection === section.id;
            return (
              <Pressable
                key={section.id}
                style={[s.chip, selected && s.chipActive]}
                onPress={() => scrollToSection(section.id)}
              >
                <Text style={[s.chipNumber, selected && s.chipNumberActive]}>
                  {section.id}
                </Text>
                <Text style={[s.chipLabel, selected && s.chipLabelActive]}>
                  {section.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>
      <ScrollView
        ref={formScrollRef}
        contentContainerStyle={s.scroll}
        scrollEventThrottle={16}
        onScroll={event => {
          const { contentOffset, layoutMeasurement, contentSize } =
            event.nativeEvent;
          syncSectionFromScroll(
            contentOffset.y,
            layoutMeasurement.height,
            contentSize.height,
          );
        }}
      >
        <Section
          n="1"
          title="Activity details"
          onLayout={(y: number) => (sectionOffsets.current[1] = y)}
        >
          <Pressable disabled={readOnly} onPress={() => setDateOpen(true)}>
            <View pointerEvents="none">
              <FormInput
                label="Activity Date"
                value={form.activityDate}
                required
                disabled
              />
            </View>
          </Pressable>
          {dateOpen && (
            <DateTimePicker
              value={new Date(form.activityDate)}
              mode="date"
              maximumDate={new Date()}
              onChange={(_, d) => {
                setDateOpen(false);
                if (d) set('activityDate', d.toISOString().slice(0, 10));
              }}
            />
          )}
          <View
            pointerEvents={type === 'farmer' && !readOnly ? 'auto' : 'none'}
          >
            <FormInput
              label="Activity Name"
              value={form.activityName}
              onChange={(v: string) => set('activityName', v)}
              required
              disabled={readOnly || type !== 'farmer'}
            />
          </View>
          <View style={s.two}>
            <View pointerEvents="none" style={{ flex: 1 }}>
              <FormInput
                label="Branch & Zone (Auto)"
                value={form.zone}
                required
                disabled
              />
            </View>
            <View pointerEvents="none" style={{ flex: 1 }}>
              <FormInput
                label="Reporting Manager (Auto)"
                value={form.reportingManagerName}
                required
                disabled
              />
            </View>
          </View>
          <Pressable
            disabled={readOnly || cfg.asr_auto}
            onPress={() => {
              setUserQuery('');
              setUserOpen(true);
            }}
          >
            <View pointerEvents="none">
              <FormInput
                label="ASR / DSR Name"
                value={form.userName}
                required
                disabled
              />
            </View>
          </Pressable>
          <Pressable disabled={readOnly} onPress={() => {
            if (!form.userId) {
              Alert.alert('Select ASR / DSR', 'Please select ASR / DSR first.');
              return;
            }
            setDistOpen(true);
          }}>
            <View pointerEvents="none">
              <FormInput
                label="Distributor Code & Name"
                value={form.distributorName}
                required
                disabled
              />
            </View>
          </Pressable>
          <Pressable
            disabled={readOnly || !form.distributorId}
            onPress={() => setDealerOpen(true)}
          >
            <View pointerEvents="none">
              <FormInput
                label={cfg.dealer_label}
                value={form.dealerName}
                disabled
              />
            </View>
          </Pressable>
          {cfg.hotel && (
            <FormInput
              label="Hotel Name"
              value={form.hotelName}
              onChange={(v: string) => set('hotelName', v)}
              required
              disabled={readOnly}
            />
          )}
          <FormInput
            label="Activity Location"
            value={form.locationText}
            onChange={(v: string) => set('locationText', v)}
            required
            disabled={readOnly}
          />
        </Section>
        <Section
          n="2"
          title={cfg.shop_mode ? 'Retailer shops' : 'Participants'}
          onLayout={(y: number) => (sectionOffsets.current[2] = y)}
        >
          {form.participants.map((p: any, i: number) => (
            <View key={i} style={s.person}>
              <View style={s.personHead}>
                <Text style={s.bold}>
                  {cfg.shop_mode ? 'Retailer' : 'Participant'} {i + 1}
                </Text>
                {i > 0 && !readOnly && (
                  <Pressable
                    onPress={() =>
                      set(
                        'participants',
                        form.participants.filter(
                          (_: any, n: number) => n !== i,
                        ),
                      )
                    }
                  >
                    <Text style={s.red}>Remove</Text>
                  </Pressable>
                )}
              </View>
              {cfg.shop_mode ? (
                <>
                  <SmallInput
                    label="Retailer Shop Name"
                    value={p.shopName}
                    disabled={readOnly}
                    onChange={(v: string) => participant(i, 'shopName', v)}
                  />
                  <SmallInput
                    label="Proprietor Name"
                    value={p.proprietorName}
                    disabled={readOnly}
                    onChange={(v: string) =>
                      participant(i, 'proprietorName', v)
                    }
                  />
                </>
              ) : (
                <>
                  <SmallInput
                    label="Participant Name"
                    value={p.name}
                    disabled={readOnly}
                    onChange={(v: string) => participant(i, 'name', v)}
                  />
                  <SmallSelect
                    label="Profession"
                    value={p.profession}
                    options={['Mechanic', 'Plumber', 'Electrician', 'Borer', 'Farmer', 'Other']}
                    disabled={readOnly}
                    onChange={(v: string) => participant(i, 'profession', v)}
                  />
                </>
              )}
              <SmallInput
                label="Mobile"
                value={p.mobile}
                disabled={readOnly}
                phone
                onChange={(v: string) => participant(i, 'mobile', v)}
              />
              <View style={s.field}>
                <Text style={s.label}>Gift Name</Text>
                <Pressable
                  disabled={readOnly}
                  style={[s.input, s.selectInput, readOnly && s.disabled]}
                  onPress={() => setGiftParticipantIndex(i)}
                >
                  <Text style={p.giftName ? s.selectValue : s.selectPlaceholder}>
                    {p.giftName || 'Select...'}
                  </Text>
                  {!readOnly && <Text style={s.selectArrow}>⌄</Text>}
                </Pressable>
              </View>
              <SmallInput
                label="Remarks"
                value={p.remarks}
                disabled={readOnly}
                onChange={(v: string) => participant(i, 'remarks', v)}
              />
              <View style={s.switch}>
                <Text>Social Media Influencer?</Text>
                <Switch
                  disabled={readOnly}
                  value={p.isInfluencer}
                  onValueChange={v => participant(i, 'isInfluencer', v)}
                />
              </View>
              {p.isInfluencer && (
                <>
                  <SmallSelect
                    label="Social Media Type"
                    value={p.socialType}
                    options={SOCIAL_TYPES}
                    disabled={readOnly}
                    onChange={(v: string) => participant(i, 'socialType', v)}
                  />
                  <SmallInput
                    label="Profile Link"
                    value={p.socialLink}
                    disabled={readOnly}
                    onChange={(v: string) => participant(i, 'socialLink', v)}
                  />
                </>
              )}
            </View>
          ))}
          {!readOnly && (
            <Pressable
              style={s.outline}
              onPress={() =>
                set('participants', [...form.participants, emptyParticipant()])
              }
            >
              <Text style={s.blue}>
                ＋ Add {cfg.shop_mode ? 'Retailer' : 'Participant'}
              </Text>
            </Pressable>
          )}
        </Section>
        <Section
          n="3"
          title="Gifts & summary"
          onLayout={(y: number) => (sectionOffsets.current[3] = y)}
        >
          <View style={s.gift}>
            <Text style={s.bold}>TOTAL GIFT COUNT</Text>
            <View style={s.counter}>
              <Pressable
                disabled={readOnly}
                onPress={() =>
                  set('giftCount', Math.max(0, Number(form.giftCount) - 1))
                }
              >
                <Text style={s.counterText}>−</Text>
              </Pressable>
              <Text style={s.counterText}>{form.giftCount}</Text>
              <Pressable
                disabled={readOnly}
                onPress={() => set('giftCount', Number(form.giftCount) + 1)}
              >
                <Text style={s.counterText}>＋</Text>
              </Pressable>
            </View>
          </View>
          <Text style={s.center}>
            {form.participants.length} Participants {form.giftCount} Gift Qty
            (Nos)
          </Text>
        </Section>
        <Section
          n="4"
          title="Expense details"
          onLayout={(y: number) => (sectionOffsets.current[4] = y)}
        >
          {form.expenses.map((x: any, i: number) => (
            <View key={x.expenseType} style={s.expense}>
              <Text style={s.bold}>
                {x.expenseType === 'gift'
                  ? 'Expense Amt'
                  : x.expenseType.toUpperCase()}
              </Text>
              <View style={s.two}>
                <SmallInput
                  label="Total Exp ₹ *"
                  value={x.totalAmount}
                  disabled={readOnly}
                  numeric
                  onChange={(v: string) => expense(i, 'totalAmount', v)}
                />
                {cfg.dealer_share && (
                  <SmallInput
                    label="Dealer Share ₹"
                    value={x.dealerShareAmount}
                    disabled={readOnly}
                    numeric
                    onChange={(v: string) => expense(i, 'dealerShareAmount', v)}
                  />
                )}
              </View>
              {cfg.dealer_share && (
                <Text style={s.muted}>
                  Dealer{' '}
                  {Number(x.totalAmount) > 0
                    ? Math.round(
                        (Number(x.dealerShareAmount) / Number(x.totalAmount)) *
                          100,
                      )
                    : 0}
                  %
                </Text>
              )}
              {x.expenseType === 'gift' && (
                <Text style={s.muted}>
                  Qty (Nos) auto from Gift Count: {form.giftCount}
                </Text>
              )}
              <SmallInput
                label={`Remarks${
                  ['hotel', 'other', 'other1', 'other2'].includes(x.expenseType)
                    ? ' *'
                    : ''
                }`}
                value={x.remarks}
                disabled={readOnly}
                onChange={(v: string) => expense(i, 'remarks', v)}
              />
              {!readOnly &&
                ['food', 'hotel', 'av', 'other', 'other1', 'other2'].includes(
                  x.expenseType,
                ) && (
                  <Pressable
                    style={s.invoice}
                    onPress={() =>
                      launchImageLibrary({ mediaType: 'mixed' }, async r => {
                        const a = r.assets?.[0];
                        if (a) {
                          const u = (await activityApi.upload(a)).data.data.url;
                          expense(i, 'invoiceUrl', u);
                        }
                      })
                    }
                  >
                    <Text style={s.blue}>
                      {x.invoiceUrl
                        ? '✓ Invoice attached'
                        : '📎 Invoice Upload'}
                    </Text>
                  </Pressable>
                )}
            </View>
          ))}
          <View style={s.total}>
            <Text style={s.blue}>TOTAL EXPENSE</Text>
            <Text style={s.totalValue}>
              ₹{total.toLocaleString('en-IN')}{' '}
              {cfg.dealer_share &&
                ` · Dealer ₹${dealerTotal.toLocaleString('en-IN')}`}
            </Text>
          </View>
        </Section>
        <Section
          n="5"
          title="Activity photos"
          onLayout={(y: number) => (sectionOffsets.current[5] = y)}
        >
          <Text style={s.muted}>
            Activity photos (optional) · {form.photos.length}/{cfg.photo_limit}{' '}
            uploaded
          </Text>
          <View style={s.photos}>
            {form.photos.map((p: any, i: number) => (
              <Image
                key={i}
                source={{ uri: p.preview || resolveMediaUrl(p.photoUrl) }}
                style={s.photo}
              />
            ))}
            {!readOnly && form.photos.length < cfg.photo_limit && (
              <Pressable style={s.photoAdd} onPress={addPhoto}>
                <Text style={s.blue}>＋ Add</Text>
              </Pressable>
            )}
          </View>
        </Section>
        <Section
          n="6"
          title="Feedback"
          onLayout={(y: number) => (sectionOffsets.current[6] = y)}
        >
          <FormInput
            label="Feedback from Participants"
            value={form.feedback}
            onChange={(v: string) => set('feedback', v)}
            multiline
            disabled={readOnly}
          />
        </Section>
      </ScrollView>
      {!readOnly && (
        <View style={s.footer}>
          <Pressable
            disabled={saving}
            style={s.draft}
            onPress={() => save(false)}
          >
            <Text>Save draft</Text>
          </Pressable>
          <Pressable
            disabled={saving}
            style={s.submit}
            onPress={() => save(true)}
          >
            <Text style={s.white}>
              {saving ? 'Please wait...' : 'Submit activity'}
            </Text>
          </Pressable>
        </View>
      )}
      <Modal visible={userOpen} animationType="slide">
        <SafeAreaView style={s.page}>
          <View style={s.searchHead}>
            <Text style={[s.bold, { flex: 1 }]}>Select ASR / DSR</Text>
            <Pressable onPress={() => {
              setUserQuery('');
              setUserOpen(false);
            }}>
              <Text style={s.blue}>Close</Text>
            </Pressable>
          </View>
          <View style={s.userSearchWrap}>
            <TextInput
              value={userQuery}
              onChangeText={setUserQuery}
              placeholder="Search ASR / DSR by name"
              placeholderTextColor="#8b94a7"
              autoCapitalize="none"
              autoCorrect={false}
              clearButtonMode="while-editing"
              style={s.input}
            />
          </View>
          <ScrollView>
            {filteredAsrDsrUsers.map((r: any) => (
              <Pressable
                key={r.id}
                style={s.result}
                onPress={() => {
                  set('userId', r.id);
                  set('userName', r.name);
                  set('distributorId', null);
                  set('distributorName', '');
                  set('dealerName', '');
                  setDistRows([]);
                  setDealerRows([]);
                  setDistQuery('');
                  setUserQuery('');
                  setUserOpen(false);
                }}
              >
                <Text style={s.bold}>{r.name}</Text>
              </Pressable>
            ))}
            {!filteredAsrDsrUsers.length && (
              <View style={s.result}>
                <Text style={s.emptyResult}>No ASR / DSR found</Text>
              </View>
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>
      <Modal
        visible={giftParticipantIndex !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setGiftParticipantIndex(null)}
      >
        <Pressable
          style={s.selectOverlay}
          onPress={() => setGiftParticipantIndex(null)}
        >
          <View style={s.selectSheet}>
            <Text style={s.selectTitle}>Select Gift Name</Text>
            {['', ...GIFT_OPTIONS].map(option => (
              <Pressable
                key={option || 'blank'}
                style={s.selectOption}
                onPress={() => {
                  if (giftParticipantIndex !== null)
                    participant(giftParticipantIndex, 'giftName', option);
                  setGiftParticipantIndex(null);
                }}
              >
                <Text style={s.selectOptionText}>
                  {option || 'Select...'}
                </Text>
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>
      <Modal visible={distOpen} animationType="slide">
        <SafeAreaView style={s.page}>
          <View style={s.searchHead}>
            <TextInput
              autoFocus
              value={distQuery}
              onChangeText={setDistQuery}
              placeholder="Search distributor code or name"
              style={s.input}
            />
            <Pressable onPress={() => setDistOpen(false)}>
              <Text style={s.blue}>Close</Text>
            </Pressable>
          </View>
          <ScrollView>
            {distRows.map(r => (
              <Pressable
                key={r.id}
                style={s.result}
                onPress={() => {
                  set('distributorId', r.id);
                  set('distributorName', r.label);
                  set('dealerName', '');
                  setDealerRows([]);
                  setDistOpen(false);
                }}
              >
                <Text style={s.bold}>{r.label}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </SafeAreaView>
      </Modal>
      <Modal visible={dealerOpen} animationType="slide">
        <SafeAreaView style={s.page}>
          <View style={s.searchHead}>
            <Text style={[s.bold, { flex: 1 }]}>Select {cfg.dealer_label}</Text>
            <Pressable onPress={() => setDealerOpen(false)}>
              <Text style={s.blue}>Close</Text>
            </Pressable>
          </View>
          <ScrollView>
            {dealerRows.map((r: any) => (
              <Pressable
                key={r.id}
                style={s.result}
                onPress={() => {
                  set('dealerName', r.name);
                  setDealerOpen(false);
                }}
              >
                <Text style={s.bold}>{r.label}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}
function Section({ n, title, children, onLayout }: any) {
  return (
    <View
      style={s.section}
      onLayout={event => onLayout?.(event.nativeEvent.layout.y)}
    >
      <View style={s.sectionTitle}>
        <Text style={s.number}>{n}</Text>
        <Text style={s.bold}>{title.toUpperCase()}</Text>
      </View>
      {children}
    </View>
  );
}
function FormInput({
  label,
  value,
  onChange,
  required,
  disabled,
  multiline,
}: any) {
  return (
    <View style={s.field}>
      <Text style={s.label}>
        {label}
        {required && <Text style={s.req}> *</Text>}
      </Text>
      <TextInput
        editable={!disabled}
        value={String(value ?? '')}
        onChangeText={onChange}
        multiline={multiline}
        style={[s.input, multiline && s.multiline, disabled && s.disabled]}
      />
    </View>
  );
}
function SmallSelect({ label, value, options, onChange, disabled }: any) {
  return (
    <View style={s.field}>
      <Text style={s.label}>{label}</Text>
      <View style={s.selectRow}>
        {(options || []).map((option: string) => {
          const active = String(value || '') === option;
          return (
            <Pressable
              key={option}
              disabled={disabled}
              onPress={() => onChange(active ? '' : option)}
              style={[s.selectChip, active && s.selectChipActive, disabled && s.disabled]}>
              <Text style={active ? s.selectChipTextActive : s.selectChipText}>{option}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
function SmallInput({ label, value, onChange, disabled, numeric, phone }: any) {
  // A phone field takes digits only and stops at 10, so the value can never reach
  // validation in a shape the form would reject.
  const handleChange = (text: string) =>
    onChange(phone ? text.replace(/\D/g, '').slice(0, 10) : text);
  return (
    <View style={s.field}>
      <Text style={s.label}>{label}</Text>
      <TextInput
        editable={!disabled}
        keyboardType={phone ? 'number-pad' : numeric ? 'decimal-pad' : 'default'}
        maxLength={phone ? 10 : undefined}
        value={String(value ?? '')}
        onChangeText={handleChange}
        style={[s.input, disabled && s.disabled]}
      />
    </View>
  );
}
const s = StyleSheet.create({
  selectRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  selectChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#c9cfe4',
    backgroundColor: '#fff',
  },
  selectChipActive: { borderColor: '#3b4db7', backgroundColor: '#e8ebff' },
  selectChipText: { fontSize: 13, color: '#4a5270' },
  selectChipTextActive: { fontSize: 13, color: '#3b4db7', fontWeight: '700' },
  page: { flex: 1, backgroundColor: '#f1f2f7' },
  header: {
    height: 72,
    paddingHorizontal: 14,
    backgroundColor: '#3b4db7',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  back: { fontSize: 38, color: '#fff' },
  mini: { fontSize: 9, color: '#bcc6fa' },
  title: { fontSize: 18, color: '#fff', fontWeight: '700' },
  status: {
    color: '#fff',
    backgroundColor: 'rgba(255,255,255,.2)',
    padding: 8,
    borderRadius: 12,
  },
  chipBar: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e4e7f0',
  },
  chipRow: { paddingHorizontal: 12, paddingVertical: 10, gap: 8 },
  chip: {
    height: 40,
    paddingHorizontal: 12,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#cbd2e8',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: '#fff',
  },
  chipActive: { backgroundColor: '#3b4db7', borderColor: '#3b4db7' },
  chipNumber: {
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#edf0f5',
    color: '#697184',
    textAlign: 'center',
    lineHeight: 24,
    fontWeight: '700',
  },
  chipNumberActive: {
    backgroundColor: 'rgba(255,255,255,.22)',
    color: '#fff',
  },
  chipLabel: { color: '#687081', fontWeight: '700' },
  chipLabelActive: { color: '#fff' },
  scroll: { padding: 12, paddingBottom: 110 },
  section: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
  },
  sectionTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  number: {
    backgroundColor: '#3b4db7',
    color: '#fff',
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 6,
  },
  bold: { fontWeight: '700', color: '#282d3a' },
  field: { flex: 1, marginBottom: 10 },
  label: { fontSize: 12, color: '#626a7b', marginBottom: 5 },
  req: { color: '#e43c49' },
  input: {
    borderWidth: 1,
    borderColor: '#dce0eb',
    backgroundColor: '#fff',
    borderRadius: 9,
    paddingHorizontal: 11,
    minHeight: 42,
    color: '#252a36',
  },
  multiline: { height: 80 },
  disabled: { backgroundColor: '#f1f2f6' },
  selectInput: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 11,
  },
  selectValue: { color: '#252a36', fontSize: 15 },
  selectPlaceholder: { color: '#8a91a1', fontSize: 15 },
  selectArrow: { color: '#626a7b', fontSize: 18 },
  selectOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,.4)',
    justifyContent: 'center',
    padding: 28,
  },
  selectSheet: { backgroundColor: '#fff', borderRadius: 16, padding: 14 },
  selectTitle: { fontSize: 17, fontWeight: '700', padding: 10 },
  selectOption: { paddingHorizontal: 12, paddingVertical: 14 },
  selectOptionText: { color: '#252a36', fontSize: 16 },
  two: { flexDirection: 'row', gap: 8 },
  person: {
    backgroundColor: '#f5f6fa',
    padding: 10,
    borderRadius: 11,
    marginBottom: 9,
  },
  personHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  red: { color: '#d74351' },
  switch: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  outline: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#3b4db7',
    borderRadius: 9,
    padding: 12,
    alignItems: 'center',
  },
  blue: { color: '#3b4db7', fontWeight: '700' },
  gift: {
    backgroundColor: '#fff2d8',
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  counter: {
    flexDirection: 'row',
    gap: 18,
    backgroundColor: '#fff',
    padding: 8,
    borderRadius: 8,
  },
  counterText: { fontWeight: '700' },
  center: { textAlign: 'center', padding: 12, color: '#596174' },
  expense: {
    borderBottomWidth: 1,
    borderBottomColor: '#eceef4',
    paddingVertical: 10,
  },
  invoice: { alignSelf: 'flex-start', paddingVertical: 9 },
  muted: { color: '#777f91', fontSize: 12 },
  total: {
    backgroundColor: '#f0f1fa',
    padding: 13,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  totalValue: { fontWeight: '700', color: '#3b4db7' },
  photos: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  photo: { width: 72, height: 72, borderRadius: 8 },
  photoAdd: {
    width: 72,
    height: 72,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#3b4db7',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    padding: 12,
    flexDirection: 'row',
    gap: 8,
  },
  draft: {
    flex: 1,
    padding: 14,
    alignItems: 'center',
    backgroundColor: '#f1f2f6',
    borderRadius: 9,
  },
  submit: {
    flex: 1.4,
    padding: 14,
    alignItems: 'center',
    backgroundColor: '#3b4db7',
    borderRadius: 9,
  },
  white: { color: '#fff', fontWeight: '700' },
  searchHead: {
    padding: 12,
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  userSearchWrap: { paddingHorizontal: 16, paddingBottom: 8 },
  emptyResult: { color: '#7b8497' },
  result: { padding: 16, borderBottomWidth: 1, borderBottomColor: '#e5e7ef' },
});
