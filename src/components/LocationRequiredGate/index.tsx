import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, BackHandler, Linking, Modal, PermissionsAndroid, Platform, Pressable, StyleSheet, View } from 'react-native';
import DeviceInfo from 'react-native-device-info';
import Svg, { Circle, Path } from 'react-native-svg';
import AppText from '../AppText/AppText';
import { useAppSelector } from '../redux/Store';
import { BRAND_GRADIENT, colors } from '../../utils/Colors';
import {
  getTrackingStatus,
  getPunchInStateToday,
  startLocationTrackingAfterPunchIn,
} from '../../services/locationTrackingService';

type Problem = 'permission' | 'gps' | null;

/**
 * Punched-in users must keep location on: live tracking depends on it, and on Android starting the
 * tracking service without it used to crash the app. Whenever the app comes to the front while
 * the user is punched in and location is off (permission removed, or the phone's location switched
 * off), this blocks the app with a choice: turn location on, or close the app. Once location is
 * back, tracking restarts and the popup goes away by itself.
 */
const LocationRequiredGate = () => {
  const { user, token } = useAppSelector(state => state.auth);
  const [problem, setProblem] = useState<Problem>(null);
  const checking = useRef(false);

  const check = useCallback(async () => {
    if (Platform.OS !== 'android' || !token || checking.current) return;
    checking.current = true;
    try {
      // The server decides; the phone's own "tracking on" flag is only used when the server
      // cannot be reached, since it can be stale (punched out from the CRM or another phone).
      const server = await getPunchInStateToday();
      const punchedIn = server ?? Boolean((await getTrackingStatus().catch(() => null))?.active);
      if (!punchedIn) {
        setProblem(null);
        return;
      }
      const fine = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION);
      const coarse = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION);
      const gpsOn = await DeviceInfo.isLocationEnabled().catch(() => true);
      const next: Problem = !(fine || coarse) ? 'permission' : !gpsOn ? 'gps' : null;
      setProblem(current => {
        // Location just came back: restart tracking, which Android refused while it was off.
        if (current && !next) void startLocationTrackingAfterPunchIn(user, token).catch(() => undefined);
        return next;
      });
    } finally {
      checking.current = false;
    }
  }, [token, user]);

  useEffect(() => {
    void check();
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active') void check();
    });
    return () => subscription.remove();
  }, [check]);

  const turnOn = async () => {
    if (problem === 'permission') {
      const result = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION);
      if (result === PermissionsAndroid.RESULTS.GRANTED) {
        void check();
        return;
      }
      // Denied for good: only the app's settings page can grant it now.
      await Linking.openSettings();
      return;
    }
    try {
      await Linking.sendIntent('android.settings.LOCATION_SOURCE_SETTINGS');
    } catch {
      await Linking.openSettings();
    }
  };

  if (!problem) return null;

  return (
    <Modal visible transparent animationType="fade" statusBarTranslucent onRequestClose={() => BackHandler.exitApp()}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <View style={styles.iconWrap}>
            <Svg width={34} height={34} viewBox="0 0 24 24" fill="none">
              <Path d="M12 22s7-6.2 7-12a7 7 0 1 0-14 0c0 5.8 7 12 7 12Z" stroke={colors.primary} strokeWidth={1.9} strokeLinejoin="round" />
              <Circle cx={12} cy={10} r={2.6} stroke={colors.primary} strokeWidth={1.9} />
            </Svg>
          </View>
          <AppText size={19} family="InterBold" color={colors.navy} align="center">Location is required</AppText>
          <AppText size={14} color="#566477" align="center" style={styles.message}>
            {problem === 'permission'
              ? 'You are punched in. Allow location access so your visits and attendance keep being tracked.'
              : 'You are punched in. Turn on your phone’s location so your visits and attendance keep being tracked.'}
          </AppText>
          <Pressable style={({ pressed }) => [styles.primary, pressed && styles.pressed]} onPress={turnOn}>
            <AppText size={15} family="InterSemiBold" color={colors.white}>Turn On Location</AppText>
          </Pressable>
          <Pressable style={({ pressed }) => [styles.secondary, pressed && styles.pressed]} onPress={() => BackHandler.exitApp()}>
            <AppText size={15} family="InterSemiBold" color={colors.navy}>Close App</AppText>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(17, 50, 91, 0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    paddingHorizontal: 22,
    paddingTop: 26,
    paddingBottom: 20,
    alignItems: 'center',
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.orangeSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  message: { marginTop: 8, marginBottom: 20, lineHeight: 20 },
  primary: {
    width: '100%',
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    experimental_backgroundImage: BRAND_GRADIENT,
  },
  secondary: {
    width: '100%',
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    borderWidth: 1.2,
    borderColor: '#EAD9B8',
  },
  pressed: { opacity: 0.85 },
});

export default LocationRequiredGate;
