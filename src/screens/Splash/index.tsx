import { View, StyleSheet, Animated, Easing } from 'react-native'
import React, { useEffect, useRef } from 'react'
import FastImage from 'react-native-fast-image';
import { SCREEN_HEIGHT } from '../../utils/misc';
import { KsbAarohBrand } from '../../components/AarohLogo';

/**
 * The AAROH logo, with its speedometer needle sweeping up from zero to where the logo has it.
 *
 * The logo is two layers cut from the original artwork and nothing else: AarohSplashBase is the
 * logo without its needle, AarohSplashNeedle is the needle alone on a canvas of the same size, so
 * the two stacked are pixel for pixel the logo as given. The needle turns about the gauge's hub,
 * which sits at 48.696% / 43.873% of the canvas.
 */
const LOGO_WIDTH = 300;
const LOGO_HEIGHT = LOGO_WIDTH * (532 / 900);
const HUB_ORIGIN = ['48.696%', '43.873%', 0];
// Needle at the start of the gauge's arc: 136 degrees back from where the logo draws it.
const ZERO_ANGLE = -136;

const SplashScreen = () => {
  const appear = useRef(new Animated.Value(0)).current;
  const sweep = useRef(new Animated.Value(ZERO_ANGLE)).current;

  useEffect(() => {
    const animation = Animated.sequence([
      Animated.timing(appear, { toValue: 1, duration: 700, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.delay(250),
      // Revs past the mark a little, like a real gauge, then settles where the logo has it.
      Animated.timing(sweep, { toValue: 8, duration: 1900, easing: Easing.inOut(Easing.cubic), useNativeDriver: true }),
      Animated.spring(sweep, { toValue: 0, friction: 4, tension: 60, useNativeDriver: true }),
    ]);
    animation.start();
    return () => animation.stop();
  }, [appear, sweep]);

  const rotate = sweep.interpolate({ inputRange: [-360, 360], outputRange: ['-360deg', '360deg'] });
  const scale = appear.interpolate({ inputRange: [0, 1], outputRange: [0.86, 1] });

  return (
    <View style={[styles.container, styles.center]}>
      <FastImage style={[styles.imageArea, styles.center]} source={require('../../assets/images/CircleArea.png')}>
        <Animated.View style={[styles.logo, { opacity: appear, transform: [{ scale }] }]}>
          <FastImage style={StyleSheet.absoluteFill} resizeMode="contain" source={require('../../assets/images/AarohSplashBase.png')} />
          <Animated.Image
            style={[StyleSheet.absoluteFill, { width: LOGO_WIDTH, height: LOGO_HEIGHT, transformOrigin: HUB_ORIGIN, transform: [{ rotate }] }]}
            resizeMode="contain"
            source={require('../../assets/images/AarohSplashNeedle.png')}
          />
        </Animated.View>
      </FastImage>
      {/* KSB first, then AAROH, at the foot of the splash - as the VRiDDHi splash has them. */}
      <Animated.View style={[styles.brandFoot, { opacity: appear }]}>
        <KsbAarohBrand size={0.62} />
      </Animated.View>
    </View>
  )
}
const styles = StyleSheet.create({
  // Light, so the logo shows in its own colours.
  container: {
    flex: 1,
    backgroundColor: 'transparent'
  },
  center: {
    justifyContent: 'center',
    alignItems: "center"
  },
  imageArea: {
    width: '100%',
    height: SCREEN_HEIGHT * 0.9
  },
  logo: {
    width: LOGO_WIDTH,
    height: LOGO_HEIGHT,
  },
  brandFoot: {
    position: 'absolute',
    bottom: 48,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
});
export default SplashScreen
