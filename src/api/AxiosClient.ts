import axios from 'axios';
import Toast from 'react-native-toast-message';
import store from '../components/redux/Store';
import { logout, setToken, setUser } from '../components/redux/slice/AuthSlice';
import { navigationRef } from '../services/NavigationService';
export const BASE_URL = 'https://app.ksbindia.co.in/FieldKonnect_API/';
export const API_BASE_URL = `${BASE_URL}api`;
export const IMAGE_BASE_URL = BASE_URL;
export const resolveMediaUrl = (value?: string | null): string => {
  if (!value) return '';
  const mediaPath = String(value).trim();
  if (!mediaPath) return '';
  if (/^(https?:)?\/\//i.test(mediaPath) || mediaPath.startsWith('file:') || mediaPath.startsWith('data:')) {
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
  const requestUrl = String(config.url || '').replace(/^\/+/, '').toLowerCase();
  const isPublicAuthRequest = requestUrl === 'api/login' || requestUrl === 'api/signup';

  // Login/signup must never carry a persisted token from an older session.
  // An invalid bearer token can make an otherwise valid login fail before the
  // new credentials are processed by the server.
  if (token && !isPublicAuthRequest) {
    config.headers.Authorization = `Bearer ${token}`;
  } else if (isPublicAuthRequest && config.headers.Authorization) {
    delete config.headers.Authorization;
  }
  return config;
});

axiosClient.interceptors.response.use(
  response => {
    return response;
  },
  error => {
    const status = error?.response?.status;
    const data = error?.response?.data;
    const message = data?.message || data?.title;
    const errorMsg = data?.error;
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
      store.dispatch(setUser(null))
      store.dispatch(setToken(null))
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
        visibilityTime: 5000
      });

      return Promise.reject(error);
    }

    return Promise.reject(error);
  },
);

export default axiosClient;
