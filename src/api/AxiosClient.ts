import axios from 'axios';
import { Platform } from 'react-native';
import Toast from 'react-native-toast-message';
import store from '../components/redux/Store';
import { logout, setToken, setUser } from '../components/redux/slice/AuthSlice';
import { navigationRef } from '../services/NavigationService';

// Single API and media origin for both Android and iOS.
export const LIVE_BASE_URL = 'https://app.ksbindia.co.in/FieldKonnect_API/';

// The local backend from docker compose. The Android emulator reaches the host
// machine through 10.0.2.2; on a real device put this machine's LAN IP here.
export const LOCAL_BASE_URL = Platform.select({
  android: 'http://10.0.2.2:8080/',
  default: 'http://localhost:8080/',
});

// !! Ship with LIVE_BASE_URL. A build made against the local one cannot reach
// !! the server from any device. Point this at LOCAL_BASE_URL while developing
// !! against the docker backend, and switch it back before any build.
export const BASE_URL = LOCAL_BASE_URL;
export const API_BASE_URL = `${BASE_URL}api`;
export const IMAGE_BASE_URL = BASE_URL;
export const resolveMediaUrl = (value?: string | null): string => {
  if (!value) return '';
  const mediaPath = String(value).trim();
  if (!mediaPath) return '';
  if (mediaPath.startsWith('file:') || mediaPath.startsWith('data:')) {
    return mediaPath;
  }

  if (/^(https?:)?\/\//i.test(mediaPath)) {
    // A full URL from the API is built from the API's own host and can leave out
    // the path it is mounted on, which makes the file unreachable. Anything under
    // uploads is re-anchored to the origin this app is configured with.
    const uploadsAt = mediaPath.indexOf('/uploads/');
    if (uploadsAt >= 0) return `${BASE_URL}${mediaPath.slice(uploadsAt + 1)}`;
    return mediaPath;
  }

  const cleanPath = mediaPath.replace(/^\/+/, '');
  if (/^(storage|public\/storage|uploads|public\/uploads)\//i.test(cleanPath)) {
    return `${BASE_URL}${cleanPath}`;
  }

  return `${BASE_URL}storage/${cleanPath}`;
};
const axiosClient = axios.create({
  baseURL: BASE_URL,
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
});

axiosClient.interceptors.request.use(async config => {
  const token = store.getState()?.auth?.token;
  const requestUrl = String(config.url || '')
    .replace(/^\/+/, '')
    .toLowerCase();
  const isPublicAuthRequest =
    requestUrl === 'api/login' || requestUrl === 'api/signup';

  // Login/signup must never carry a persisted token from an older session.
  // An invalid bearer token can make an otherwise valid login fail before the
  // new credentials are processed by the server.
  if (token && !isPublicAuthRequest) {
    config.headers.Authorization = `Bearer ${token}`;
  } else if (isPublicAuthRequest && config.headers.Authorization) {
    delete config.headers.Authorization;
  }
  const requestData =
    config.data instanceof FormData ? '<multipart form data>' : config.data;
  console.log('[API REQUEST]', {
    method: String(config.method || 'get').toUpperCase(),
    url: `${config.baseURL || ''}${config.url || ''}`,
    params: config.params,
    data: requestData,
  });
  return config;
});

axiosClient.interceptors.response.use(
  response => {
    console.log('[API RESPONSE]', {
      method: String(response.config.method || 'get').toUpperCase(),
      url: `${response.config.baseURL || ''}${response.config.url || ''}`,
      status: response.status,
      data: response.data,
    });
    return response;
  },
  error => {
    const status = error?.response?.status;
    const data = error?.response?.data;
    const message = data?.message || data?.title;
    const errorMsg = data?.error;
    console.log('[API ERROR]', {
      method: String(error?.config?.method || 'get').toUpperCase(),
      url: `${error?.config?.baseURL || ''}${error?.config?.url || ''}`,
      status,
      data,
      message: error?.message,
    });
    if (
      status === 401 ||
      message == 'Server error: Unauthenticated.' ||
      errorMsg == 'Unauthenticated.'
    ) {
      Toast.show({
        type: 'error',
        text1: 'Session expired. Please login again',
      });
      // navigation.navigate('LoginScreen')
      store.dispatch(logout());
      store.dispatch(setUser(null));
      store.dispatch(setToken(null));
      // ✅ clear redux auth
      store.dispatch(logout());

      // ✅ navigate to login
      navigationRef.current?.reset({
        index: 0,
        routes: [{ name: 'LoginScreen' }],
      });

      return Promise.reject(error);
    }
    if (status === 400 || status === 422) {
      const validationMessage = data?.errors
        ? Object.values(data.errors).flat().find(Boolean)
        : undefined;
      Toast.show({
        type: 'error',
        text1: String(
          message ||
            validationMessage ||
            data?.reminders?.[0]?.message ||
            data?.errorMessage ||
            data?.error ||
            'Something went wrong',
        ),
        visibilityTime: 5000,
      });

      return Promise.reject(error);
    }

    return Promise.reject(error);
  },
);

export default axiosClient;
