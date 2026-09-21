import React from 'react';
import { Dimensions, Image, StyleSheet, View } from 'react-native';

const ART_W = 941;
const ART_H = 1672;
const ART_CREAM = '#FEEFDC'; // the artwork's own top edge, so the sky above it carries on

/**
 * The painted scene the whole app sits on - the same backdrop as the VRiDDHi app. It is drawn
 * once, behind the navigator, and every screen's page background is transparent so it shows
 * through: full strength on splash and the sign-in screens, a wash inside the app where cards and
 * figures have to stay the thing being read.
 *
 * Sized in points: the width is the screen's and the height follows the artwork's proportions,
 * pinned to the foot, so the dune reaches both edges and any spare height above is plain sky.
 */
const { width: SCREEN_W } = Dimensions.get('window');
const ART_DRAWN_H = Math.round((SCREEN_W * ART_H) / ART_W);
const FADED_OPACITY = 0.32;

export default function AppBackdrop({ faded = false }: { faded?: boolean }) {
  return (
    <View style={styles.screen} pointerEvents="none">
      <Image
        source={require('../assets/images/app-backdrop.jpg')}
        style={[styles.art, { width: SCREEN_W, height: ART_DRAWN_H }, faded && { opacity: FADED_OPACITY }]}
        resizeMode="stretch"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: ART_CREAM,
    overflow: 'hidden',
  },
  art: {
    position: 'absolute',
    bottom: 0,
    left: 0,
  },
});
