/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import React, { useEffect, useState } from 'react';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { Button, PermissionsAndroid, Platform, StatusBar, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  createNavigationContainerRef,
  DefaultTheme,
  NavigationContainer,
  NavigationContainerRef,
} from '@react-navigation/native';
import { KeyboardProvider } from "react-native-keyboard-controller";

import Toast, {
  BaseToast,
  BaseToastProps,
  ErrorToast,
} from 'react-native-toast-message';
import { colors } from './src/utils/Colors';
import store, { persistor } from './src/components/redux/Store';
import SplashScreen from './src/screens/Splash';
import AppBackdrop from './src/components/AppBackdrop';
import LocationRequiredGate from './src/components/LocationRequiredGate';
import Routes from './src/navigations/Routes';
import { navigationRef } from './src/services/NavigationService';
import {
  initializeLiveLocationTracking,
  runAndroidFirstTimeLiveLocationSetup,
} from './src/services/liveLocationService';
import { startPushNotifications } from './src/services/pushNotifications';
;


const queryClient = new QueryClient();

const FULL_BACKDROP_ROUTES = ['LoginScreen', 'SignUpScreen', 'ForceUpdateScreen', 'AccountPendingScreen'];

const App = () => {
  const [loading, setLoading] = useState(true);
  // The backdrop is at full strength where it is the design (splash, sign-in screens) and a wash
  // behind everything else.
  const [fullBackdrop, setFullBackdrop] = useState(true);
  const syncBackdrop = () => {
    const name = navigationRef.getCurrentRoute()?.name;
    setFullBackdrop(!name || FULL_BACKDROP_ROUTES.includes(name));
  };
  // const navigationRef = React.useRef<NavigationContainerRef<any>>(null);
  //  const navigationRef = createNavigationContainerRef();

  useEffect(() => {
    // Long enough for the splash's needle to sweep up and settle, and to be seen there.
    setTimeout(() => {
      setLoading(false);
    }, 6500);
  }, []);

  const initializeAfterRehydrate = () => {
    void runAndroidFirstTimeLiveLocationSetup().catch(error => {
      console.warn('Initial permission setup failed', error);
    });
    void initializeLiveLocationTracking().catch(error => {
      console.warn('Live location initialization failed', error);
    });
    startPushNotifications();
  };

  const MyTheme = {
    ...DefaultTheme,
    colors: {
      ...DefaultTheme.colors,
      background: 'transparent',
    },
  };

  const toastConfig = {
    success: (props: BaseToastProps) => (
      <BaseToast
        {...props}

        text2NumberOfLines={0}
        style={{
          borderLeftColor: colors.blue,
        }}
      />
    ),
    error: (props: BaseToastProps) => <ErrorToast {...props} text1NumberOfLines={0}
      text2NumberOfLines={0} />,
  };


  return (

    <KeyboardProvider statusBarTranslucent navigationBarTranslucent>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <Provider store={store}>
          <PersistGate persistor={persistor} onBeforeLift={initializeAfterRehydrate}>
            <QueryClientProvider client={queryClient}>
                <View style={{ flex: 1, backgroundColor: colors.bgColor }}>
                  <AppBackdrop faded={!loading && !fullBackdrop} />
                  <StatusBar
                    translucent
                    backgroundColor="transparent"
                    barStyle={'light-content'}
                  />

                  <NavigationContainer
                    ref={navigationRef}
                    theme={MyTheme}
                    onReady={() => {
                      // Navigation is ready
                      console.log('Navigation is ready');
                      syncBackdrop();
                    }}
                    onStateChange={syncBackdrop}
                  >

                    {loading ? <SplashScreen /> : <Routes />}
                    {!loading && <LocationRequiredGate />}
                  </NavigationContainer>

                  <Toast config={toastConfig} visibilityTime={1500} />
                  {Platform.OS == 'android' && (
                    <SafeAreaView style={{ backgroundColor: colors.white }} /> 
                  )}

                </View>
            </QueryClientProvider> 
          </PersistGate>
        </Provider>
      </GestureHandlerRootView>
    </KeyboardProvider>
  );
};

export default App
