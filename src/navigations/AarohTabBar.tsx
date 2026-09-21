import React, { useEffect, useRef } from 'react';
import { Animated, Platform, Pressable, StyleSheet, View } from 'react-native';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AppText from '../components/AppText/AppText';
import { BRAND_GRADIENT, colors } from '../utils/Colors';
import { SCREEN_WIDTH } from '../utils/misc';
import { HomeIcon, MessageIcon, TaskIcon, TwoMenIcon } from '../assets/svgs/BottomTabSvgs';

/**
 * The AAROH bottom bar: a warm cream capsule floating over the screen. The active tab lifts out of the
 * bar into a brand-gradient circle with a white icon, a little larger than the rest, and springs
 * there whenever the tab changes. Inactive tabs are brand-coloured icons with a softer label.
 */
const TABS: Record<string, { label: string; Icon: React.ComponentType<any> }> = {
  Home: { label: 'Home', Icon: HomeIcon },
  Activities: { label: 'Activity', Icon: TwoMenIcon },
  Rating: { label: 'Rating', Icon: TaskIcon },
  OrderList: { label: 'History', Icon: MessageIcon },
};

const BAR_WIDTH = SCREEN_WIDTH * 0.9;
const BAR_HEIGHT = 74;
const BUBBLE = 50;

const TabItem = ({ label, Icon, focused, onPress, onLongPress }: {
  label: string;
  Icon: React.ComponentType<any>;
  focused: boolean;
  onPress: () => void;
  onLongPress: () => void;
}) => {
  const progress = useRef(new Animated.Value(focused ? 1 : 0)).current;

  useEffect(() => {
    Animated.spring(progress, {
      toValue: focused ? 1 : 0,
      friction: 6,
      tension: 90,
      useNativeDriver: true,
    }).start();
  }, [focused, progress]);

  const lift = progress.interpolate({ inputRange: [0, 1], outputRange: [0, -22] });
  const scale = progress.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] });
  const iconScale = progress.interpolate({ inputRange: [0, 1], outputRange: [1, 1.15] });
  const labelOpacity = progress.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1] });

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={focused ? { selected: true } : {}}
      accessibilityLabel={label}
      onPress={onPress}
      onLongPress={onLongPress}
      style={styles.item}
    >
      <Animated.View style={[styles.iconWrap, { transform: [{ translateY: lift }] }]}>
        {/* The gradient bubble grows in behind the icon; the cream ring makes it look cut out of the bar. */}
        <Animated.View style={[styles.bubble, { opacity: progress, transform: [{ scale }] }]} />
        <Animated.View style={{ transform: [{ scale: iconScale }] }}>
          <Icon color={focused ? colors.white : colors.primary} />
        </Animated.View>
      </Animated.View>
      <Animated.View style={{ opacity: labelOpacity, transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [0, -4] }) }], marginTop: -4 }}>
        <AppText size={focused ? 12.5 : 12} color={focused ? colors.primary : '#93A1AF'} family={focused ? 'InterSemiBold' : 'InterMedium'}>
          {label}
        </AppText>
      </Animated.View>
    </Pressable>
  );
};

const AarohTabBar = ({ state, navigation }: BottomTabBarProps) => {
  const insets = useSafeAreaInsets();
  const bottom = Platform.OS === 'ios' ? 14 : insets.bottom + 10;

  return (
    <View pointerEvents="box-none" style={[styles.wrap, { bottom }]}>
      <View style={styles.bar}>
        {state.routes.map((route, index) => {
          const tab = TABS[route.name];
          if (!tab) return null;
          const focused = state.index === index;
          const onPress = () => {
            // Screens listen for tabPress (Home refreshes on a repeated press), so it is emitted
            // exactly as the stock bar does.
            const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (!focused && !event.defaultPrevented) navigation.navigate(route.name as never);
          };
          const onLongPress = () => navigation.emit({ type: 'tabLongPress', target: route.key });
          return <TabItem key={route.key} label={tab.label} Icon={tab.Icon} focused={focused} onPress={onPress} onLongPress={onLongPress} />;
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  bar: {
    width: BAR_WIDTH,
    height: BAR_HEIGHT,
    borderRadius: BAR_HEIGHT / 2,
    // Warm cream like the VRiDDHi bar, not white: it reads as part of the app, not a slab.
    backgroundColor: 'rgba(253, 245, 233, 0.98)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    shadowColor: '#5C3B05',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 14,
    borderWidth: 1,
    borderColor: 'rgba(208, 136, 48, 0.28)',
  },
  item: {
    flex: 1,
    height: BAR_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 6,
  },
  iconWrap: {
    width: BUBBLE,
    height: BUBBLE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bubble: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: BUBBLE / 2,
    backgroundColor: colors.primary,
    experimental_backgroundImage: BRAND_GRADIENT,
    borderWidth: 4,
    borderColor: '#FDF5E9',
    shadowColor: '#8A5A08',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.45,
    shadowRadius: 10,
    elevation: 8,
  },
});

export default AarohTabBar;
