import { PermissionsAndroid, Platform } from 'react-native';
import Toast from 'react-native-toast-message';
import axiosClient from '../api/AxiosClient';
import store from '../components/redux/Store';
import { navigationRef } from './NavigationService';

/**
 * Push notifications (Firebase Cloud Messaging). After sign-in the phone's token is sent to the
 * server, which keeps it on the user; on sign-out it is taken off again.
 *
 * Tapping a notification opens the screen it names. The server puts it in the message data:
 * `screen` (a route name, e.g. "RetailerKyc") and optionally `params` (JSON, e.g. {"retailerId":12}).
 * This works whether the app was open, in the background or closed.
 *
 * Firebase is loaded defensively: a build without google-services.json / GoogleService-Info.plist,
 * or without the native module, has no Firebase app - then nothing here runs and nothing fails.
 */
type Messaging = any;

let started = false;
let registeredFor: string | null = null;
let currentToken: string | null = null;
let listeners: Array<() => void> = [];

const loadMessaging = (): Messaging | null => {
  try {
    const { getApps } = require('@react-native-firebase/app');
    if (!getApps().length) return null;
    const { getMessaging } = require('@react-native-firebase/messaging');
    return getMessaging();
  } catch {
    return null;
  }
};

const api = () => require('@react-native-firebase/messaging');

// Screens that are not "inside" the app: a notification tapped while one of these shows waits.
const OUTSIDE_ROUTES = ['LoginScreen', 'SignUpScreen', 'ForceUpdateScreen', 'AccountPendingScreen'];
let pendingTarget: { screen: string; params?: object } | null = null;
let flushTimer: ReturnType<typeof setInterval> | null = null;

const targetOf = (message: any) => {
  const screen = message?.data?.screen;
  if (!screen || typeof screen !== 'string') return null;
  let params: object | undefined;
  try {
    params = message?.data?.params ? JSON.parse(message.data.params) : undefined;
  } catch {
    params = undefined;
  }
  return { screen, params };
};

/** Opens the target once the app is ready - after the splash, signed in, navigator mounted. */
const flushTarget = () => {
  if (flushTimer) return;
  let waited = 0;
  flushTimer = setInterval(() => {
    waited += 500;
    const ready = navigationRef.isReady() && store.getState()?.auth?.token
      && !OUTSIDE_ROUTES.includes(navigationRef.getCurrentRoute()?.name ?? '');
    if (ready && pendingTarget) {
      const { screen, params } = pendingTarget;
      pendingTarget = null;
      try {
        (navigationRef as any).navigate(screen, params);
      } catch {
        // A screen this build does not have: stay where the app is.
      }
    }
    if (!pendingTarget || waited > 30000) {
      clearInterval(flushTimer!);
      flushTimer = null;
      pendingTarget = null;
    }
  }, 500);
};

const openFromNotification = (message: any) => {
  const target = targetOf(message);
  if (!target) return;
  pendingTarget = target;
  flushTarget();
};

const askPermission = async (messaging: Messaging): Promise<boolean> => {
  if (Platform.OS === 'android') {
    if (Platform.Version < 33) return true;
    const result = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
    return result === PermissionsAndroid.RESULTS.GRANTED;
  }
  const { requestPermission, AuthorizationStatus } = api();
  const status = await requestPermission(messaging);
  return status === AuthorizationStatus.AUTHORIZED || status === AuthorizationStatus.PROVISIONAL;
};

const sendToken = async (token: string) => {
  currentToken = token;
  await axiosClient.post('api/push/register', { token, platform: Platform.OS });
};

const register = async (authToken: string) => {
  const messaging = loadMessaging();
  if (!messaging) return;
  try {
    if (!(await askPermission(messaging))) return;
    const { getToken, onTokenRefresh } = api();
    const token = await getToken(messaging);
    if (!token || store.getState()?.auth?.token !== authToken) return;
    await sendToken(token);
    registeredFor = authToken;
    listeners.push(onTokenRefresh(messaging, (next: string) => {
      if (store.getState()?.auth?.token) void sendToken(next).catch(() => undefined);
    }));
  } catch (error) {
    console.warn('Push registration failed', error);
  }
};

/** Call once at start-up. Registers whenever a user is signed in, including an already signed-in one. */
export const startPushNotifications = () => {
  if (started) return;
  started = true;
  const messaging = loadMessaging();
  if (!messaging) return;
  const { onMessage, onNotificationOpenedApp, getInitialNotification } = api();

  // Open, in front: iOS shows the banner itself (AppDelegate + firebase.json); Android does not,
  // so the app shows one - tapping it opens the same screen the system notification would.
  listeners.push(onMessage(messaging, (message: any) => {
    if (Platform.OS !== 'android') return;
    const title = message?.notification?.title;
    const body = message?.notification?.body;
    if (title || body) Toast.show({
      type: 'success', position: 'top', text1: title || body, text2: title ? body : undefined, visibilityTime: 6000,
      onPress: () => { Toast.hide(); openFromNotification(message); },
    });
  }));
  // In the background, tapped.
  listeners.push(onNotificationOpenedApp(messaging, openFromNotification));
  // Closed, and started by the tap.
  void getInitialNotification(messaging).then((message: any) => { if (message) openFromNotification(message); }).catch(() => undefined);

  const check = () => {
    const authToken = store.getState()?.auth?.token;
    if (authToken && authToken !== registeredFor) {
      registeredFor = authToken;
      void register(authToken);
    }
    if (!authToken) registeredFor = null;
  };
  check();
  listeners.push(store.subscribe(check));
};

/** Call on sign-out, before the session is cleared, so this phone stops getting that user's notifications. */
export const stopPushForUser = async () => {
  try {
    if (currentToken) await axiosClient.post('api/push/unregister', { token: currentToken });
  } catch {
    // Signing out must not wait on this; the next sign-in on this phone moves the token anyway.
  }
  registeredFor = null;
};

/** Required by Firebase for messages that arrive while the app is in the background or closed. */
export const registerBackgroundPushHandler = () => {
  try {
    const { getApps } = require('@react-native-firebase/app');
    if (!getApps().length) return;
    const { getMessaging, setBackgroundMessageHandler } = require('@react-native-firebase/messaging');
    setBackgroundMessageHandler(getMessaging(), async () => undefined);
  } catch {
    // No Firebase in this build.
  }
};
