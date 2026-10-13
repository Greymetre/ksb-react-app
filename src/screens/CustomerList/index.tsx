import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Keyboard, Modal, Pressable, ScrollView, TextInput, View } from 'react-native';
import AppText from '../../components/AppText/AppText';
import { ArrowDownIcon, CrossIcon } from '../../assets/svgs/SvgsFile';
import { styles } from './styles';
import { rw } from '../../utils/responsive';
import { NavigationProp, ParamListBase, useFocusEffect, useNavigation } from '@react-navigation/native';
import { colors, BRAND_GRADIENT } from '../../utils/Colors';
import { rfmCategoryColors } from '../../utils/rfmCategory';
import { SearchSvgIcon } from '../../assets/svgs/HomePageSvgs';
import { DATA } from '../../components/Comman/CommanFunction';
import CustomerCard from '../../components/atoms/CustomerCard';
import { useMutateBeatCustomerList, useMutateCustomerListApi, useMutateSecondaryCustListApi } from '../../api/query/CustomerApi';
import SecondaryCustomerCard from '../../components/atoms/SecondaryCustomerCard';
import Geolocation from '@react-native-community/geolocation';
import Toast from 'react-native-toast-message';
import store from '../../components/redux/Store';
import axios from 'axios';
import useLocationHook from '../../api/hooks/uselocationhook';
import { current } from '@reduxjs/toolkit';
import axiosClient, { BASE_URL } from "../../api/AxiosClient";
import { API_ENDPOINT } from '../../api/ApiUrls';
const CustomerList = ({ route }: any) => {
  const [focusText, setFocusText] = useState(false);
  // Start in loading state so the empty-state message never flashes before
  // the first customer API response is received.
  const [loader, setLoader] = useState(true);
  const [loader1, setLoader1] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [customerData, setCustomerData] = useState<any[]>([]);
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const { mutateAsync: mutateCustomerList } = useMutateCustomerListApi();
  const { mutateAsync: mutateSecondaryCustList } = useMutateSecondaryCustListApi();
  const { mutateAsync: mutateBeatCustomerList } = useMutateBeatCustomerList();
  // const [currentLat, setCurrentLat] = useState<number | null>(null)
  // const [currentLng, setCurrentLng] = useState<number | null>(null)
  const [locationError, setLocationError] = useState<string | null>(null)
  const [isPunchedIn, setIsPunchedIn] = useState<any>(false);
  const [hasActiveCheckInSomewhere, setHasActiveCheckInSomewhere] = useState(false);
  const [activeCheckInCustomerId, setActiveCheckInCustomerId] = useState<string | null>(null);
  const isSecondary = !!route?.params?.type;
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(null);
  const [hasMore, setHasMore] = useState(true);

  const [showCityModal, setShowCityModal] = useState(false);
  const [cityList, setCityList] = useState([]);
  const [currentCheckin, setCurrentCheckin] = useState<any>();
  const currentCheckinType = String(currentCheckin?.entity_type || '').trim().toLowerCase().replace(/-/g, '_');
  const isCurrentDistributor = ['distributor', 'master_distributor', 'dealer'].includes(currentCheckinType);
  const isCurrentRetailer = ['secondary_customer', 'retailer'].includes(currentCheckinType);
  const [citySearchText, setCitySearchText] = useState('');
  const [selectedCity, setSelectedCity] = useState<any>(null);
  const [stateList, setStateList] = useState<any[]>([]);
  const [selectedState, setSelectedState] = useState<any>(null);
  const [showStateModal, setShowStateModal] = useState(false);
  const [stateSearchText, setStateSearchText] = useState('');

  // The retailer's RFM category. Worked out on the server against the other retailers of
  // the same state; a retailer that has never ordered is Bronze.
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showCategoryModal, setShowCategoryModal] = useState(false);

  // STATUS
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState('All'); // ✅ default

  // KYC. Pre-set when the Loyalty invoice tab opened this screen from its KYC tile, so
  // the list arrives already showing exactly the retailers that count referred to.
  const [kycFilter, setKycFilter] = useState<string | null>(route?.params?.kyc ?? null);
  // Opened from the Loyalty screen's Active Retailer KYC tiles: the list and its chip counts
  // cover only retailers who have submitted a loyalty invoice.
  const invoiceActive = !!route?.params?.invoiceActive;
  // Counts for the four stages, over the same customers and filters as the list.
  const [kycCounts, setKycCounts] = useState<Record<string, number>>({});
  const KYC_STAGES = [
    { key: null, label: 'All', countKey: 'total' },
    { key: 'approved', label: 'Fully Approved', countKey: 'approved' },
    { key: 'complete_pending', label: 'Awaiting Review', countKey: 'complete_pending' },
    { key: 'partial', label: 'Partly Submitted', countKey: 'partial' },
    { key: 'none', label: 'Not Started', countKey: 'not_started' },
  ];

  const fetchKycCounts = async () => {
    if (!route?.params?.type || route?.params?.beatId) return;
    try {
      const params: any = { type: route.params.type };
      if (selectedStatus && selectedStatus !== 'All') params.status = selectedStatus;
      if (selectedCity?.city_name) params.city_name = selectedCity.city_name;
      if (selectedUser?.id) params.for_user_id = selectedUser.id;
      if (selectedCategory) params.category = selectedCategory;
      if (selectedState?.state_name) params.state_name = selectedState.state_name;
      if (invoiceActive) params.invoice_active = 1;
      const response = await axiosClient.get(`${API_ENDPOINT.SECONDARY_CUSTOMER}/kyc-summary`, { params });
      setKycCounts(response?.data?.data ?? {});
    } catch {
      setKycCounts({});
    }
  };

  // Add these near your other states
  const [showUserModal, setShowUserModal] = useState(false);
  const [userList, setUserList] = useState<any[]>([]);
  const [userSearchText, setUserSearchText] = useState('');
  const [selectedUser, setSelectedUser] = useState<any>(null);

  /** The RFM categories, best first. Bronze is where a retailer that has never ordered sits. */
const RFM_CATEGORIES: (string | null)[] = [null, 'Platinum', 'Diamond', 'Gold', 'Silver', 'Bronze'];

const STATUS_LIST = [
    { label: 'All', value: 'All' },
    { label: 'Approved', value: 'APPROVED' },
    { label: 'Pending', value: 'PENDING' },
    { label: 'Rejected', value: 'REJECTED' },
  ];
  useFocusEffect(
    useCallback(() => {
      if (route?.params?.type) {
        fetchCustomers(
          1,
          false,
          selectedStatus,
          selectedCity,
          selectedUser
        );

      } else {
        fetchCustomers(1);
      }
      fetchPunchInStatus()
      fetchKycCounts()
      // setSelectedCity(null)
      // setSelectedStatus('All')
      // setSearchText('')
      // setSelectedUser(null)
    }, [selectedStatus, selectedCity, selectedUser, selectedCategory, selectedState, kycFilter])
  )

  // Option A: Fixed title (recommended for most cases)
  useFocusEffect(
    useCallback(() => {
      navigation.setOptions({
        headerTitle: `${invoiceActive ? 'Active ' : ''}${route?.params?.customerTypeName || route?.params?.type || 'Customers'}${total ? ` (${total})` : ''}`,
      });
    }, [navigation, total, route?.params?.customerTypeName, route?.params?.type])
  );


  const fetchHierarchyUsers = async () => {
    try {
      const token = store.getState()?.auth?.token;

      const res = await axios.get(
        `${BASE_URL}api/getMyHierarchyUsers`, // ← your endpoint
        {
          headers: { Authorization: `Bearer ${token}` },
          params: { type: route.params.type }, // optional, if backend needs it
        }
      );

      if (res?.data?.status) {
        setUserList(res.data.users || []); // assuming response has users array
      }
    } catch (e) {
      Toast.show({ type: 'error', text1: 'Failed to load users' });
      console.log('Hierarchy users fetch error:', e);
    }
  };

  useFocusEffect(
    useCallback(() => {
      handleCUrtrentCheckin()
    }, [])
  )



  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      fetchCustomers(1, false);
    }, 400);

    return () => clearTimeout(timer);
  }, [searchText]);


  const fetchPunchInStatus = async () => {
    try {
      const token = store.getState()?.auth?.token;

      const res = await axios.get(`${BASE_URL}api/getPunchin`, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
      });

      const data = res.data;

      if (data.status === 'success' && data.data?.length > 0) {
        const latest = data.data[0]; // assuming latest or only one for today
        // You may want to also check punchin_date === today's date
        const isToday =
          latest.punchin_date ===
          new Intl.DateTimeFormat('en-CA', {
            timeZone: 'Asia/Kolkata',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
          }).format(new Date());

        if (isToday && latest?.punchin_date && !latest?.punchout_date) {
          setIsPunchedIn(true);
        } else {
          setIsPunchedIn(false);
        }
        if (latest?.punchout_date && latest?.punchin_date && isToday) {
          setIsPunchedIn("end");
        }
      } else {
        setIsPunchedIn(false);
      }
    } catch (err) {
      console.error('Failed to fetch punch-in status:', err);
      setIsPunchedIn(false)
    } finally {
    }
  }


  const loadMore = () => {
    if (!loader && hasMore) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchCustomers(nextPage, true);
    }
  };

  const fetchStates = async () => {
    try {
      const token = store.getState()?.auth?.token;
      const res = await axios.get(`${BASE_URL}api/secondary-customer/states`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res?.data?.status) setStateList(res.data.data || []);
    } catch (e) {
      console.log('states', e);
    }
  };

  const fetchCities = async () => {
    try {
      const token = store.getState()?.auth?.token;

      const res = await axios.get(
        `${BASE_URL}api/secondary-customer/cities`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (res?.data?.status) {
        setCityList(res.data.data || []);
      }
    } catch (e) {
      Toast.show({ type: 'error', text1: 'Failed to load cities' });
    }
  };
  const handleCUrtrentCheckin = async () => {
    try {
      const token = store.getState()?.auth?.token;

      const res = await axios.get(
        `${BASE_URL}api/getCurrentOpenCheckin`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      console.log(res, 'resresresresresresres')
      if (res?.data?.status == "success") {
        setCurrentCheckin(res?.data?.open_checkin);
      }
    } catch (e) {
      Toast.show({ type: 'error', text1: 'Failed to load cities' });
    }
  };

  const filteredStates = stateList.filter((item: any) =>
    item.state_name.toLowerCase().includes(stateSearchText.toLowerCase())
  );

  // With a state chosen the city list offers only that state's cities; with none, all of
  // them. A city that carries no state of its own is kept rather than quietly dropped.
  const citiesInState = selectedState
    ? cityList.filter((item: any) => item.state_id == null || Number(item.state_id) === Number(selectedState.id))
    : cityList;

  const filteredCities = citiesInState.filter((item: any) =>
    item.city_name.toLowerCase().includes(citySearchText.toLowerCase())
  );

  const { coords, } = useLocationHook();

  // Access as
  const currentLat = coords?.latitude;
  const currentLng = coords?.longitude;

  const fetchCustomers = useCallback(async (
    pageNumber = 1,
    isLoadMore = false,
    overrideStatus?: string,
    overrideCity?: any,
    overrideUser?: any,
    clearCity = false,
    clearUser = false,
    overrideCategory?: string | null,
    clearCategory = false,
    overrideState?: any,
    clearState = false
  ) => {
    try {
      setLoader(true);

      let res;
      if (route?.params?.beatId) {
        res = await mutateBeatCustomerList({
          type: route?.params?.beatId,
          search: searchText,
          page: pageNumber,
          status: overrideStatus == 'All'
            ? null
            : overrideStatus ? overrideStatus : selectedStatus === 'All'
              ? null
              : overrideStatus ?? selectedStatus,
          city_name: clearCity ? null : overrideCity?.city_name ?? selectedCity?.city_name,
          // for_user_id: clearUser ? null : overrideUser?.id ?? selectedUser?.id,
        });
      } else if (isSecondary) {
        res = await mutateSecondaryCustList({
          type: route.params.type,
          search: searchText,
          page: pageNumber,
          status: overrideStatus == 'All'
            ? null
            : overrideStatus ? overrideStatus : selectedStatus === 'All'
              ? null
              : overrideStatus ?? selectedStatus,
          city_name: clearCity ? null : overrideCity?.city_name ?? selectedCity?.city_name,
          for_user_id: clearUser ? null : overrideUser?.id ?? selectedUser?.id,
          kyc: kycFilter,
          invoice_active: invoiceActive,
          category: clearCategory ? null : overrideCategory ?? selectedCategory,
          state_name: clearState ? null : overrideState?.state_name ?? selectedState?.state_name,
        });
        console.log('Secondary customer list response:', {
          type: route.params.type,
          search: searchText,
          page: pageNumber,
          status: overrideStatus == 'All'
            ? null
            : overrideStatus ? overrideStatus : selectedStatus === 'All'
              ? null
              : overrideStatus ?? selectedStatus,
          city_name: clearCity ? null : overrideCity?.city_name ?? selectedCity?.city_name,
          for_user_id: clearUser ? null : overrideUser?.id ?? selectedUser?.id,
        });
      } else {
        res = await mutateCustomerList({
          search: searchText,
          page: pageNumber,
        });
      }


      const newData = res?.data?.data?.data || [];
      if (isLoadMore) {
        setCustomerData(prev => Array.from(new Map(
          [...prev, ...newData].map((row: any) => [String(row?.id ?? row?.customer_id ?? row?.customer?.id), row])
        ).values()));
      } else {
        // if(route?.params?.beatId) return
        if (newData?.length == 0 && pageNumber == 1) {
          setCustomerData([])
        } else {
          setCustomerData(newData);
        }
      }


      const currentPage = Number(res?.data?.data?.current_page ?? pageNumber);
      const lastPage = Number(res?.data?.data?.last_page ?? res?.data?.page_count ?? currentPage);
      setHasMore(currentPage < lastPage);
      setPage(currentPage);
      setTotal(res?.data?.data?.total);

    } catch (error) {
      console.log("Customer list error:", error?.response);
    } finally {
      setLoader(false);
      setLoader1(false)
    }
  }, [searchText, isSecondary, selectedStatus, selectedCity, selectedUser, selectedCategory, selectedState, kycFilter, navigation, route]);


  const clearFilters = () => {
    setSelectedCity(null);
    setCitySearchText('');
    setShowCityModal(false);
    setSelectedStatus(selectedStatus); // default
    setLoader1(true);
    fetchCustomers(1, false, selectedStatus, null, null, true);
    // fetchCustomers(1, false, selectedStatus, null);
  };

  const clearFiltersUser = () => {
    setSelectedCity(null);
    setSelectedUser(null);               // ← reset user
    setCitySearchText('');
    setUserSearchText('');
    setShowCityModal(false);
    setShowUserModal(false);
    setShowStatusModal(false);
    setLoader1(true);
    setPage(1);
    fetchCustomers(1, false, selectedStatus, selectedCity, null, false, true); // clear city & user
  };

  return (
    <View style={styles.container}>
      <View style={[styles.container, { paddingHorizontal: rw(18) }]} >
        <View style={[styles.textInputMainView, {
          marginTop: rw(15),
        }]}>
          <SearchSvgIcon />
          <TextInput
            placeholder="Search Customer..."
            placeholderTextColor={'rgba(255, 255, 255, 0.5)'}
            style={[styles.textInput]}
            value={searchText}
            onSubmitEditing={() => {
              Keyboard.dismiss();
            }}
            onChangeText={setSearchText}
            onFocus={() => setFocusText(true)}
            onBlur={() => setFocusText(false)}
          />
          {searchText && (
            <Pressable style={styles.icon} onPress={() => {
              setSearchText('')
            }}>
              <CrossIcon />
            </Pressable>
          )}
        </View>
        {
          route?.params?.type && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.filterScroll}
              contentContainerStyle={styles.filterRow}
            >
              <Pressable
                style={[styles.UserBox, styles.filterBox, styles.row]}
                onPress={() => setShowStatusModal(true)}
              >
                <View style={{ flex: 1 }}>
                  <AppText size={12} color="black">
                    {selectedStatus}
                  </AppText>
                </View>
                <ArrowDownIcon />
              </Pressable>
              {
                !route?.params?.beatId && (
                  <Pressable
                    style={[styles.UserBox, styles.filterBox, styles.row]}
                    onPress={() => {
                      setShowUserModal(true);
                      fetchHierarchyUsers();
                    }}
                  >
                    <View style={{ flex: 1 }}>
                      <AppText
                        size={12}
                        color={selectedUser ? 'black' : '#718096'}
                      >
                        {selectedUser ? selectedUser.name : 'User'}
                      </AppText>
                    </View>
                    <ArrowDownIcon />
                  </Pressable>
                )
              }


              <Pressable
                style={[styles.UserBox, styles.filterBox, styles.row]}
                onPress={() => {
                  setShowStateModal(true);
                  fetchStates();
                }}
              >
                <View style={{ flex: 1 }}>
                  <AppText size={12} color={selectedState ? 'black' : '#718096'} numLines={1}>
                    {selectedState ? selectedState.state_name : 'State'}
                  </AppText>
                </View>
                <ArrowDownIcon />
              </Pressable>
              <Pressable
                style={[styles.UserBox, styles.filterBox, styles.row]}
                onPress={() => {
                  setShowCityModal(true);
                  fetchCities();
                }}
              >
                <View style={{ flex: 1 }}>
                  <AppText size={12} color={selectedCity ? 'black' : '#718096'}>
                    {selectedCity ? selectedCity.city_name : 'City'}
                  </AppText>
                </View>
                <ArrowDownIcon />
              </Pressable>

              <Pressable
                style={[styles.UserBox, styles.filterBox, styles.row]}
                onPress={() => setShowCategoryModal(true)}
              >
                <View style={{ flex: 1 }}>
                  <AppText size={12} color={selectedCategory ? 'black' : '#718096'}>
                    {selectedCategory ?? 'Category'}
                  </AppText>
                </View>
                <ArrowDownIcon />
              </Pressable>

            </ScrollView>
          )
        }

        {
          route?.params?.type && !route?.params?.beatId && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.kycChipScroll} contentContainerStyle={styles.kycChipRow}>
              {KYC_STAGES.map(stage => {
                const active = kycFilter === stage.key;
                return (
                  <Pressable
                    key={stage.label}
                    style={[styles.kycChip, active && styles.kycChipActive]}
                    onPress={() => {
                      if (active) return;
                      setKycFilter(stage.key);
                      setLoader1(true);
                      setPage(1);
                    }}
                  >
                    <AppText
                      size={12}
                      family="InterMedium"
                      color={active ? 'white' : 'black'}
                      opacity={active ? 1 : 0.6}
                    >
                      {stage.label} ({kycCounts[stage.countKey] ?? 0})
                    </AppText>
                  </Pressable>
                );
              })}
            </ScrollView>
          )
        }

        {
          loader1 || (loader && customerData.length === 0) ? (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
              <ActivityIndicator size="large" color={colors.navy} />
              <AppText size={15} family="InterMedium" color={colors.navy}>
                Loading customers...
              </AppText>
            </View>
          ) : (
            <FlatList
              data={customerData}
              keyExtractor={(item) => item.id}
              renderItem={({ item, index }) => {
                if (route?.params?.beatId) {
                  return (
                    <SecondaryCustomerCard customerType={route?.params?.customerTypeName || route?.params?.type} currentLat={currentLat} currentLng={currentLng} locationError={locationError} item={item?.customer} navigation={navigation} index={index} isPunchedIn={isPunchedIn} onCheckInPress={() => {
                      handleCUrtrentCheckin()
                    }} />
                  )
                } else if (isSecondary) {
                  return (
                    <SecondaryCustomerCard customerType={route?.params?.customerTypeName || route?.params?.type} currentLat={currentLat} currentLng={currentLng} locationError={locationError} item={item} navigation={navigation} index={index} isPunchedIn={isPunchedIn} onCheckInPress={() => {
                      handleCUrtrentCheckin()
                    }} />
                  )
                } else {
                  return (<CustomerCard currentLat={currentLat} currentLng={currentLng} locationError={locationError} item={item} navigation={navigation} index={index} isPunchedIn={isPunchedIn} onCheckInPress={() => {
                    handleCUrtrentCheckin()
                  }} />)
                }
              }}
              ListHeaderComponent={() => {
                if (currentCheckin?.entity_details && isCurrentRetailer) {
                  return (
                    <SecondaryCustomerCard customerType={currentCheckin?.entity_type || route?.params?.customerTypeName || route?.params?.type} currentLat={currentLat} currentLng={currentLng} locationError={locationError} item={currentCheckin?.entity_details} navigation={navigation} index={-1} isPunchedIn={isPunchedIn} type={currentCheckin} />
                  )
                } else if (currentCheckin?.entity_details && isCurrentDistributor) {
                  return (
                    <CustomerCard currentLat={currentLat} currentLng={currentLng} locationError={locationError} item={currentCheckin?.entity_details} navigation={navigation} index={-1} isPunchedIn={isPunchedIn} type={currentCheckin} />
                  )
                }
              }}
              onEndReached={loadMore}
              onEndReachedThreshold={0.5}
              contentContainerStyle={styles.listContainer}
              ListEmptyComponent={() => (
                <View style={{ justifyContent: 'center', alignItems: 'center', paddingTop: 40 }}>
                  {loader ? (
                    <>
                      <ActivityIndicator size="large" color={colors.navy} />
                      <AppText size={15} family="InterMedium" color={colors.navy}>
                        Loading customers...
                      </AppText>
                    </>
                  ) : (
                    <AppText size={16} family='InterMedium' color='black'>No customer found</AppText>
                  )}
                </View>
              )}
              showsVerticalScrollIndicator={false}
              ListFooterComponent={() =>
                loader && page > 1 ? (
                  <View style={{ paddingVertical: 20 }}>
                    <ActivityIndicator size="large" color={colors.navy} />
                  </View>
                ) : (
                  <View style={{ height: 30 }} />
                )
              }

            />
          )
        }

      </View>
      <Modal visible={showStateModal} statusBarTranslucent transparent animationType="slide">
        <Pressable
          style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' }}
          onPress={() => setShowStateModal(false)}
        >
          <Pressable style={{ backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '75%' }}>
            <View style={[styles.row, { justifyContent: 'space-between', alignItems: 'center' }]}>
              <AppText size={18} family="InterSemiBold">Select State</AppText>
              <Pressable
                onPress={() => {
                  setSelectedState(null);
                  setShowStateModal(false);
                  setStateSearchText('');
                  setLoader1(true);
                  setPage(1);
                  fetchCustomers(1, false, selectedStatus, selectedCity, selectedUser, false, false, selectedCategory, false, null, true);
                }}
                style={{ paddingVertical: 8, paddingHorizontal: 20, borderRadius: 8, borderWidth: 1, borderColor: '#ccc' }}
              >
                <AppText size={14} family="InterMedium" color="black">Clear Filter</AppText>
              </Pressable>
            </View>

            <TextInput
              placeholder="Search state..."
              value={stateSearchText}
              onChangeText={setStateSearchText}
              style={{ borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 10, marginVertical: 12 }}
            />

            <FlatList
              data={filteredStates}
              keyExtractor={item => String(item.id)}
              renderItem={({ item }: { item: any }) => (
                <Pressable
                  onPress={() => {
                    // A city already chosen in another state would leave the listing empty,
                    // so it is dropped along with the state change.
                    const cityFits = !selectedCity || selectedCity.state_id == null
                      || Number(selectedCity.state_id) === Number(item.id);
                    if (!cityFits) { setSelectedCity(null); setCitySearchText(''); }
                    setSelectedState(item);
                    setShowStateModal(false);
                    setStateSearchText('');
                    setLoader1(true);
                    setPage(1);
                    fetchCustomers(1, false, selectedStatus, cityFits ? selectedCity : null, selectedUser,
                      !cityFits, false, selectedCategory, false, item);
                  }}
                  style={({ pressed }) => ({
                    paddingVertical: 14,
                    borderBottomWidth: 1,
                    borderColor: '#eee',
                    backgroundColor: pressed ? '#f5f5f5' : 'transparent',
                  })}
                >
                  <AppText size={16}>{item.state_name}</AppText>
                </Pressable>
              )}
            />
          </Pressable>
        </Pressable>
      </Modal>
      <Modal visible={showCategoryModal} statusBarTranslucent transparent animationType="slide">
        <Pressable
          style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' }}
          onPress={() => setShowCategoryModal(false)}
        >
          <Pressable style={{ backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20 }}>
            <AppText size={18} family="InterSemiBold">Select Category</AppText>
            <AppText size={12} color="#718096">Rated against the other retailers of the same state.</AppText>
            <View style={{ height: 16 }} />
            {RFM_CATEGORIES.map(item => (
              <Pressable
                key={item ?? 'all'}
                onPress={() => {
                  setSelectedCategory(item);
                  setShowCategoryModal(false);
                  setLoader1(true);
                  setPage(1);
                  fetchCustomers(1, false, selectedStatus, selectedCity, selectedUser, false, false, item, item === null, selectedState);
                }}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#eee' }}
              >
                {item ? <View style={[styles.categoryDot, { backgroundColor: rfmCategoryColors(item).dot }]} /> : null}
                <AppText size={16} color={selectedCategory === item ? '#8A5A08' : 'black'}>
                  {item ?? 'All Categories'}
                </AppText>
              </Pressable>
            ))}
          </Pressable>
        </Pressable>
      </Modal>
      <Modal visible={showStatusModal} statusBarTranslucent transparent animationType="slide">
        <Pressable
          style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' }}
          onPress={() => setShowStatusModal(false)}
        >
          <Pressable style={{
            backgroundColor: '#fff',
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            padding: 20,

          }}>
            <AppText size={18} family="InterSemiBold">Select Status</AppText>
            <View style={{ height: 20 }} />
            {STATUS_LIST.map(item => (
              <Pressable
                key={item.value}
                onPress={() => {
                  setSelectedStatus(item.value);
                  setShowStatusModal(false);
                  setLoader1(true);
                  setPage(1);
                  fetchCustomers(1, false, item.value, selectedCity);
                }}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingVertical: 14,
                  borderBottomWidth: 1,
                  borderBottomColor: '#eee',

                }}
              >
                <View
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: 6,
                    borderWidth: 2,
                    borderColor:
                      selectedStatus === item.value ? colors.blue : '#ccc',
                    backgroundColor:
                      selectedStatus === item.value ? colors.navy : 'transparent', experimental_backgroundImage: selectedStatus === item.value ? BRAND_GRADIENT : undefined,
                    marginRight: 14,
                  }}
                />
                <AppText size={16} family="InterRegular" color="black">
                  {item.label}
                </AppText>
                {/* <AppText size={16}>{item.label}</AppText> */}
              </Pressable>
            ))}
          </Pressable>
        </Pressable>
      </Modal>
      <Modal visible={showCityModal} statusBarTranslucent transparent animationType="slide">
        <Pressable
          style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' }}
          onPress={() => setShowCityModal(false)}
        >
          <Pressable style={{
            backgroundColor: '#fff',
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            padding: 20,
            height: '75%',
          }}>
            <View style={{ flexDirection: "row", alignItems: 'center', justifyContent: 'space-between', }}>
              <AppText size={18} family="InterSemiBold">Select City</AppText>
              <Pressable
                onPress={clearFilters}
                style={{
                  paddingVertical: 8,
                  paddingHorizontal: 20,
                  borderRadius: 8,
                  borderWidth: 1,
                  borderColor: '#ccc',
                }}
              >
                <AppText size={14} family='InterMedium' color='black'>Clear Filter</AppText>
              </Pressable>
            </View>

            {/* SEARCH */}
            <TextInput
              placeholder="Search city..."
              value={citySearchText}
              onChangeText={setCitySearchText}
              style={{
                borderWidth: 1,
                borderColor: '#ddd',
                borderRadius: 8,
                padding: 10,
                marginVertical: 12,
              }}
            />

            {/* LIST */}
            <FlatList
              data={filteredCities}
              keyExtractor={item => String(item.id)}
              renderItem={({ item }: { item: any }) => (
                <Pressable
                  onPress={() => {
                    setSelectedCity(item);
                    setShowCityModal(false);
                    setCitySearchText('');
                    setLoader1(true);
                    setPage(1);
                    fetchCustomers(1, false, selectedStatus, item);
                  }}
                  style={({ pressed }) => ({
                    paddingVertical: 14,
                    borderBottomWidth: 1,
                    borderColor: '#eee',
                    backgroundColor: pressed ? '#f5f5f5' : 'transparent',
                  })}
                >
                  <AppText size={16}>{item.city_name}</AppText>
                </Pressable>
              )}
            />
          </Pressable>
        </Pressable>
      </Modal>
      <Modal visible={showUserModal} statusBarTranslucent transparent animationType="slide">
        <Pressable
          style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' }}
          onPress={() => setShowUserModal(false)}
        >
          <Pressable
            style={{
              backgroundColor: '#fff',
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              padding: 20,
              height: '75%',
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <AppText size={18} family="InterSemiBold">Select User</AppText>
              <Pressable
                onPress={clearFiltersUser}
                style={{
                  paddingVertical: 8,
                  paddingHorizontal: 20,
                  borderRadius: 8,
                  borderWidth: 1,
                  borderColor: '#ccc',
                }}
              >
                <AppText size={14} family="InterMedium" color="black">Clear Filter</AppText>
              </Pressable>
            </View>

            {/* Search */}
            <TextInput
              placeholder="Search user..."
              value={userSearchText}
              onChangeText={setUserSearchText}
              style={{
                borderWidth: 1,
                borderColor: '#ddd',
                borderRadius: 8,
                padding: 10,
                marginVertical: 12,
              }}
            />

            {/* List */}
            <FlatList
              data={userList.filter((item: any) =>
                item.name?.toLowerCase().includes(userSearchText.toLowerCase())
              )}
              keyExtractor={item => String(item.id)}
              renderItem={({ item }: { item: any }) => (
                <Pressable
                  onPress={() => {
                    setSelectedUser(item);
                    setShowUserModal(false);
                    setUserSearchText('');
                    setLoader1(true);
                    setPage(1);
                    fetchCustomers(1, false, selectedStatus, selectedCity, item);
                  }}
                  style={({ pressed }) => ({
                    paddingVertical: 14,
                    borderBottomWidth: 1,
                    borderColor: '#eee',
                    backgroundColor: pressed ? '#f5f5f5' : 'transparent',
                  })}
                >
                  <AppText size={16}>{item.name}</AppText>
                  {/* Optional: show more info */}
                  {/* <AppText size={13} color="#666">{item.mobile || '—'}</AppText> */}
                </Pressable>
              )}
              ListEmptyComponent={() => (
                <AppText style={{ textAlign: 'center', marginTop: 30 }}>
                  No users found
                </AppText>
              )}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </View>

  );
}


export default CustomerList;
