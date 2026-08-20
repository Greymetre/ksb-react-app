import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Keyboard, Pressable, TextInput, View } from 'react-native';
import { CrossIcon } from '../../assets/svgs/SvgsFile';
import { rw } from '../../utils/responsive';
import { NavigationProp, ParamListBase, useFocusEffect, useNavigation } from '@react-navigation/native';
import { colors } from '../../utils/Colors';
import { SearchSvgIcon } from '../../assets/svgs/HomePageSvgs';
import Geolocation from '@react-native-community/geolocation';
import Toast from 'react-native-toast-message';
import store from '../../components/redux/Store';
import axios from 'axios';
import { styles } from '../CustomerList/styles';
import AppText from '../../components/AppText/AppText';
import SecondaryCustomerCard from '../../components/atoms/SecondaryCustomerCard';
import { BASE_URL } from "../../api/AxiosClient";
const BeatCustomerDetails = ({ route }: any) => {
    const { beatId, beatName } = route.params || {};
    const [searchText, setSearchText] = useState('');
    const [customers, setCustomers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const navigation = useNavigation<NavigationProp<ParamListBase>>();
    const [currentLat, setCurrentLat] = useState<number | null>(null)
    const [currentLng, setCurrentLng] = useState<number | null>(null)
    const [locationError, setLocationError] = useState<string | null>(null)
    const [isPunchedIn, setIsPunchedIn] = useState<any>(false);
    console.log(beatId, beatName, 'beatId, beatName');
    const fetchBeatCustomers = useCallback(async (pageNumber = 1, append = false) => {
        if (!beatId) {
            setLoading(false);
            return;
        }

        const token = store.getState()?.auth?.token;
        if (!token) {
            setLoading(false);
            return;
        }

        try {
            append ? setLoadingMore(true) : setLoading(true);
            const params = new URLSearchParams({ beat_id: String(beatId), page: String(pageNumber), per_page: '10' });
            if (searchText.trim()) params.append('search', searchText.trim());
            const url = `${BASE_URL}api/getBeatCustomers?${params.toString()}`;
            console.log(url, 'urlurl')
            // Optional: add search if you want server-side filtering
            // if (searchText?.trim()) url += `&search=${encodeURIComponent(searchText.trim())}`;

            const response = await axios.get(url, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    Accept: 'application/json',
                },
            });

            const data = response.data;

            const newRows = Array.isArray(data?.data?.data)
                ? data.data.data
                : Array.isArray(data?.data) ? data.data : [];
            if (data.status === 'success') {
                setCustomers(previous => {
                    const combined = append ? [...previous, ...newRows] : newRows;
                    return Array.from(new Map(combined.map((row: any) => [String(row?.beat_customer_id ?? row?.customer?.id), row])).values());
                });
                const lastPage = Number(data?.data?.last_page ?? data?.page_count ?? 1);
                setPage(pageNumber);
                setHasMore(pageNumber < lastPage);
            } else {
                if (!append) setCustomers([]);
                setHasMore(false);
            }
        } catch (err: any) {
            console.error('Beat customers fetch failed:', err);
            Toast.show({
                type: 'error',
                text1: 'Error',
                text2: err?.response?.data?.message || 'Network issue',
            });
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    }, [beatId, searchText]);

    useFocusEffect(
        useCallback(() => {
            getCurrentLocation();
            fetchPunchInStatus();
        }, [])
    );

    useEffect(() => {
        const timer = setTimeout(() => {
            setPage(1);
            setHasMore(true);
            fetchBeatCustomers(1, false);
        }, 400); // debounce ~400ms

        return () => clearTimeout(timer);
    }, [fetchBeatCustomers, searchText]);


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


    // ── Fetch current location once ─────────────────────────────
    const getCurrentLocation = () => {
        Geolocation.getCurrentPosition(
            (position) => {
                setCurrentLat(position.coords.latitude)
                setCurrentLng(position.coords.longitude)
                setLocationError(null)
            },
            (error) => {
                console.log('Location fetch error:', error)
                let msg = 'Unable to get location'

                if (error.code === 1) {
                    msg = 'Location permission denied'
                } else if (error.code === 2) {
                    msg = 'Location services disabled'
                } else if (error.code === 3) {
                    msg = 'Location request timed out'
                }

                setLocationError(msg)
                Toast.show({
                    type: 'error',
                    text1: 'Location Error',
                    text2: msg,
                    position: 'top',
                    visibilityTime: 4000,
                })
            },
            {
                enableHighAccuracy: true,
                timeout: 15000,
                maximumAge: 10000,
            }
        )
    }


    return (
        <View style={[styles.container, { paddingHorizontal: rw(18) }]}>
                {loading ? (
                    <View style={styles.center}>
                        <ActivityIndicator size="large" color={colors.blue} />
                    </View>
                ) : (
                    <>

                        <AppText size={20} color="black" style={{  marginTop: rw(20) }}>
                            {beatName}
                        </AppText>
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
                            />
                            {searchText && (
                                <Pressable style={styles.icon} onPress={() => {
                                    setSearchText('')
                                }}>
                                    <CrossIcon />
                                </Pressable>
                            )}
                        </View>

                        <FlatList
                            data={customers}
                            keyExtractor={(item) => item.id}
                            renderItem={({ item, index }) => {
                                return (
                                    <SecondaryCustomerCard currentLat={currentLat} currentLng={currentLng} locationError={locationError} item={item?.customer} navigation={navigation} index={index} isPunchedIn={isPunchedIn} />
                                )
                            }}
                            contentContainerStyle={styles.listContainer}
                            showsVerticalScrollIndicator={false}
                            onEndReached={() => {
                                if (!loading && !loadingMore && hasMore) fetchBeatCustomers(page + 1, true);
                            }}
                            onEndReachedThreshold={0.5}
                            ListFooterComponent={loadingMore ? <ActivityIndicator size="small" color={colors.blue} /> : null}
                            ListEmptyComponent={
                                <AppText size={16} color="#666" style={{ textAlign: 'center', marginTop: rw(120) }}>
                                    No customers in this beat
                                </AppText>
                            }
                        />
                    </>
                )}
        </View>

    );
}


export default BeatCustomerDetails;
