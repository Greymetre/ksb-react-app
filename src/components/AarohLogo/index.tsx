import React from 'react';
import { ImageBackground, StyleSheet, View, ViewStyle } from 'react-native';
import FastImage from 'react-native-fast-image';

/**
 * The AAROH brand, always in its own colours. AarohLogo is the logo with the "Raise | Reach |
 * Conquer" line, shown straight on the light login and splash screens. AarohMark is the compact
 * one for the orange header and drawer, where it sits on a small white pill so its orange is not
 * lost against the orange behind it.
 */
const LOGO_RATIO = 900 / 532; // AarohLogo.png
const MARK_RATIO = 360 / 197; // AarohMark.png

export const AarohLogo = ({ height = 120, style }: { height?: number; style?: ViewStyle }) => (
  <View style={[styles.card, styles.cardLarge, style]}>
    <FastImage
      style={{ height, width: height * LOGO_RATIO }}
      resizeMode="contain"
      source={require('../../assets/images/AarohLogo.png')}
    />
  </View>
);

export const AarohMark = ({ height = 30, style }: { height?: number; style?: ViewStyle }) => (
  <View style={[styles.card, styles.pill, style]}>
    <FastImage
      style={{ height, width: height * MARK_RATIO }}
      resizeMode="contain"
      source={require('../../assets/images/AarohMark.png')}
    />
  </View>
);

const styles = StyleSheet.create({
  card: { alignItems: 'center', justifyContent: 'center' },
  cardLarge: {},
  brandRow: { flexDirection: 'row', alignItems: 'center' },
  backdropChip: {
    backgroundColor: '#FEEFDC',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 5,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(208,136,48,0.35)',
  },
  backdropChipImage: { borderRadius: 12 },
  menuLine: { height: 2, width: '100%', borderRadius: 1 },
  brandDivider: { width: 1, backgroundColor: 'rgba(208,136,48,0.45)' },
  pill: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 5,
    shadowColor: '#7A2E0A',
    shadowOpacity: 0.18,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
});

const KSB_RATIO = 287 / 138; // ksb-lockup.png, the same file the VRiDDHi app uses

/**
 * KSB first, then AAROH, with a hairline between them so they read as two brands - the
 * arrangement the VRiDDHi app uses on its splash, sign-in screens and home header.
 *
 * `plain` (sign-in, splash): straight on the light backdrop, the full AAROH logo.
 * `pill` (home header, drawer): the compact pair on a chip of the login screen's own backdrop -
 * the same cream painted scene - so both logos show in their own colours over the gradient.
 */
/** Three short lines - the side menu button, a little smaller than a standard 24pt icon. */
export const MenuLines = ({ color = '#FFFFFF', width = 18 }: { color?: string; width?: number }) => (
  <View style={{ width, gap: 4 }}>
    <View style={[styles.menuLine, { backgroundColor: color }]} />
    <View style={[styles.menuLine, { backgroundColor: color, width: width * 0.75 }]} />
    <View style={[styles.menuLine, { backgroundColor: color }]} />
  </View>
);

export const KsbAarohBrand = ({ variant = 'plain', size = 1 }: { variant?: 'plain' | 'pill'; size?: number }) => {
  if (variant === 'pill') {
    const h = 28 * size;
    return (
      <ImageBackground
        source={require('../../assets/images/app-backdrop.jpg')}
        resizeMode="cover"
        style={[styles.brandRow, styles.backdropChip, { gap: 8 * size }]}
        imageStyle={styles.backdropChipImage}>
        <FastImage style={{ height: h, width: h * KSB_RATIO }} resizeMode="contain" source={require('../../assets/images/ksb-lockup.png')} />
        <View style={[styles.brandDivider, { height: h + 2 }]} />
        <FastImage style={{ height: h, width: h * MARK_RATIO }} resizeMode="contain" source={require('../../assets/images/AarohMark.png')} />
      </ImageBackground>
    );
  }
  const ksbH = 70 * size;
  const aarohH = 84 * size;
  return (
    <View style={[styles.brandRow, { gap: 18 * size }]}>
      <FastImage style={{ height: ksbH, width: ksbH * KSB_RATIO }} resizeMode="contain" source={require('../../assets/images/ksb-lockup.png')} />
      <View style={[styles.brandDivider, { height: 92 * size }]} />
      <FastImage style={{ height: aarohH, width: aarohH * LOGO_RATIO }} resizeMode="contain" source={require('../../assets/images/AarohLogo.png')} />
    </View>
  );
};
