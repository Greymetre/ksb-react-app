import React, { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import AppText from '../AppText/AppText';
import { BRAND_GRADIENT, colors } from '../../utils/Colors';
import { registerDisclosureListener, resolveLocationConsent } from './locationConsent';

/**
 * Prominent location disclosure (Google Play requirement). It is shown by the consent gate
 * immediately before the app requests any location permission. Mount it once at the app root.
 * It describes the data, the purpose, and that collection continues in the background / when
 * the app is closed, and only proceeds on the user's explicit "Allow".
 */
const LocationDisclosureHost = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    registerDisclosureListener(setVisible);
    return () => registerDisclosureListener(null);
  }, []);

  if (!visible) return null;

  return (
    <Modal visible transparent animationType="fade" statusBarTranslucent onRequestClose={() => resolveLocationConsent(false)}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <View style={styles.iconWrap}>
            <Svg width={34} height={34} viewBox="0 0 24 24" fill="none">
              <Path d="M12 22s7-6.2 7-12a7 7 0 1 0-14 0c0 5.8 7 12 7 12Z" stroke={colors.primary} strokeWidth={1.9} strokeLinejoin="round" />
              <Circle cx={12} cy={10} r={2.6} stroke={colors.primary} strokeWidth={1.9} />
            </Svg>
          </View>

          <AppText size={19} family="InterBold" color={colors.navy} align="center">
            Location data notice
          </AppText>

          <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent} showsVerticalScrollIndicator={false}>
            <AppText size={14} color="#566477" style={styles.paragraph}>
              AAROH collects location data to record your field attendance and customer visits. After you
              punch in, your location is used to mark your attendance location and to track your visit
              locations during working hours.
            </AppText>
            <AppText size={14} color="#566477" style={styles.paragraph}>
              This location data is collected in the background — including when the app is closed or not
              in use — so that live tracking continues until you punch out. Location is collected only after
              you punch in, and stops when you punch out.
            </AppText>
            <AppText size={13} color="#7A8698" style={styles.paragraph}>
              Tap "Allow" to continue and grant location access on the next screen. You can turn it off
              anytime from your phone settings.
            </AppText>
          </ScrollView>

          <Pressable
            style={({ pressed }) => [styles.primary, pressed && styles.pressed]}
            onPress={() => resolveLocationConsent(true)}
          >
            <AppText size={15} family="InterSemiBold" color={colors.white}>Allow</AppText>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}
            onPress={() => resolveLocationConsent(false)}
          >
            <AppText size={15} family="InterSemiBold" color={colors.navy}>Not now</AppText>
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
    maxWidth: 400,
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
  body: { width: '100%', maxHeight: 280, marginTop: 10, marginBottom: 18 },
  bodyContent: { paddingBottom: 2 },
  paragraph: { lineHeight: 20, marginBottom: 12 },
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

export default LocationDisclosureHost;
