import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, RefreshControl, ScrollView, View } from 'react-native';
import FastImage from 'react-native-fast-image';
import Toast from 'react-native-toast-message';
import Svg, { Circle, Path } from 'react-native-svg';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
import { useDispatch } from 'react-redux';
import axiosClient, { resolveMediaUrl } from '../../api/AxiosClient';
import axiosClientForm from '../../api/AxiosForm';
import { API_ENDPOINT } from '../../api/ApiUrls';
import AppText from '../../components/AppText/AppText';
import { UserIcon } from '../../assets/svgs/SvgsFile';
import { setUser } from '../../components/redux/slice/AuthSlice';
import { useAppSelector } from '../../components/redux/Store';
import { colors } from '../../utils/Colors';
import { styles } from './styles';

const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

const CameraIcon = () => (
  <Svg width={16} height={16} viewBox="0 0 24 24">
    <Path
      fill={colors.blue}
      d="M20 5h-3.17l-1.24-1.35A2 2 0 0014.12 3H9.88a2 2 0 00-1.47.65L7.17 5H4a2 2 0 00-2 2v11a2 2 0 002 2h16a2 2 0 002-2V7a2 2 0 00-2-2z"
    />
    <Circle cx={12} cy={12.5} r={3.2} fill={colors.white} />
  </Svg>
);

const text = (value?: any, fallback = '-') => {
  const value_ = value === null || value === undefined ? '' : String(value).trim();
  return value_ || fallback;
};

const day = (value?: string | null) => {
  if (!value) return '-';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return String(value);
  return parsed.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

// Role names mix acronyms (ASR, ZM.) with plain words, same as the web header.
const formatRole = (role?: string) => {
  const name = String(role || '').trim();
  if (!name) return '';
  const lower = name.toLowerCase();
  if (lower === 'superadmin') return 'Super Admin';
  if (lower === 'subadmin') return 'Sub Admin';
  if (name !== lower) return name;
  return name.charAt(0).toUpperCase() + name.slice(1);
};

const MyProfile = () => {
  const dispatch = useDispatch();
  const { user } = useAppSelector(state => state.auth);

  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [sourceOpen, setSourceOpen] = useState(false);

  const loadProfile = useCallback(async (mode: 'initial' | 'refresh') => {
    if (mode === 'refresh') setRefreshing(true);
    else setLoading(true);
    try {
      const response = await axiosClient.get(API_ENDPOINT.PROFILE_DETAILS);
      const row = response?.data?.user ?? response?.data?.data ?? null;
      if (row) setProfile(row);
    } catch (error: any) {
      // The interceptor already toasts the API message; keep the login payload
      // on screen instead of an empty page.
      console.log('Profile load error:', error?.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadProfile('initial');
  }, [loadProfile]);

  const uploadPhoto = useCallback(
    async (asset: any) => {
      setUploading(true);
      try {
        const form = new FormData();
        form.append('profile_image', {
          uri: asset.uri,
          name: asset.fileName || `profile-${Date.now()}.jpg`,
          type: asset.type || 'image/jpeg',
        } as any);

        const response = await axiosClientForm.post(API_ENDPOINT.PROFILE_PHOTO, form, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        const row = response?.data?.user ?? null;
        if (row) setProfile(row);

        // Keep the drawer avatar and every other screen reading auth.user in step.
        const savedPath = row?.profile_image ?? '';
        dispatch(setUser({ ...(user || {}), profile_image: savedPath }));

        Toast.show({ type: 'success', text1: 'Profile picture updated', position: 'top' });
      } catch (error: any) {
        Toast.show({
          type: 'error',
          text1: error?.response?.data?.message || 'Could not update the profile picture',
          position: 'top',
        });
      } finally {
        setUploading(false);
      }
    },
    [dispatch, user],
  );

  const pickFrom = useCallback(
    (source: 'camera' | 'gallery') => {
      setSourceOpen(false);
      const options = { mediaType: 'photo' as const, quality: 0.8 as const, maxWidth: 1200, maxHeight: 1200 };
      const handler = (response: any) => {
        if (response.didCancel) return;
        if (response.errorCode) {
          Toast.show({
            type: 'error',
            text1:
              response.errorCode === 'camera_unavailable'
                ? 'Camera is not available'
                : 'Permission denied',
            position: 'top',
          });
          return;
        }

        const asset = (response.assets || [])[0];
        if (!asset?.uri) return;
        if ((asset.fileSize || 0) > MAX_PHOTO_BYTES) {
          Toast.show({ type: 'error', text1: 'Picture must be under 5 MB', position: 'top' });
          return;
        }
        uploadPhoto(asset);
      };

      if (source === 'camera') {
        launchCamera({ ...options, saveToPhotos: false }, handler);
        return;
      }
      launchImageLibrary({ ...options, selectionLimit: 1 }, handler);
    },
    [uploadPhoto],
  );

  const roles = useMemo(() => {
    const fromProfile = Array.isArray(profile?.roles) ? profile.roles.map((role: any) => role?.name) : [];
    const fromLogin = Array.isArray(user?.user_type) ? user.user_type : [];
    return (fromProfile.length ? fromProfile : fromLogin).map(formatRole).filter(Boolean);
  }, [profile, user]);

  const photoUri = resolveMediaUrl(profile?.profile_image || user?.profile_image);
  const name = text(profile?.name || user?.name, 'User');

  const sections = useMemo(
    () => [
      {
        title: 'Contact',
        rows: [
          ['Mobile', text(profile?.mobile || user?.mobile)],
          ['Email', text(profile?.email || user?.email)],
          ['Base Location', text(profile?.location)],
        ],
      },
      {
        title: 'Organization',
        rows: [
          ['Designation', text(profile?.designation_name)],
          ['Department', text(profile?.department_name)],
          ['Zone', text(profile?.division_name)],
          ['Branches', text(profile?.branch_names)],
          ['Reporting Manager', text(profile?.reporting_name)],
        ],
      },
      {
        title: 'Employment',
        rows: [
          ['Employee Code', text(profile?.employee_codes)],
          ['Date of Joining', day(profile?.date_of_joining)],
          ['Payroll Grade', text(profile?.payroll_name || profile?.payroll)],
          ['Assigned Cities', text(profile?.city_names)],
          ['Status', String(profile?.active || 'Y').toUpperCase() === 'N' ? 'Inactive' : 'Active'],
        ],
      },
    ],
    [profile, user],
  );

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 30 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => loadProfile('refresh')} colors={[colors.blue]} tintColor={colors.blue} />
        }
      >
        <View style={styles.hero}>
          <Pressable style={styles.avatarWrap} disabled={uploading} onPress={() => setSourceOpen(true)}>
            <UserIcon />
            {photoUri ? <FastImage source={{ uri: photoUri }} style={styles.avatarImage} /> : null}
            {uploading ? (
              <View style={styles.avatarBusy}>
                <ActivityIndicator color={colors.white} />
              </View>
            ) : null}
            <View style={styles.cameraBadge}>
              <CameraIcon />
            </View>
          </Pressable>

          <View style={styles.heroText}>
            <AppText size={20} family="InterBold" color="white">
              {name}
            </AppText>
            <AppText size={14} family="InterMedium" color="white">
              {text(profile?.mobile || user?.mobile, '')}
            </AppText>
            <View style={styles.chipRow}>
              {roles.map((role: string) => (
                <View key={role} style={styles.chip}>
                  <AppText size={11} family="InterSemiBold" color="white">
                    {role}
                  </AppText>
                </View>
              ))}
            </View>
          </View>
        </View>

        {loading && !profile ? (
          <View style={styles.loading}>
            <ActivityIndicator size="large" color={colors.blue} />
          </View>
        ) : (
          sections.map(section => (
            <View key={section.title} style={styles.card}>
              <View style={styles.cardTitle}>
                <AppText size={15} family="InterSemiBold" color="black">
                  {section.title}
                </AppText>
              </View>
              {section.rows.map(([label, value], index) => (
                <View
                  key={label}
                  style={[styles.row, index === section.rows.length - 1 ? styles.rowLast : null]}
                >
                  <View style={styles.rowLabel}>
                    <AppText size={12.5} family="InterMedium" color="#7A8699">
                      {label}
                    </AppText>
                  </View>
                  <View style={styles.rowValue}>
                    <AppText size={13.5} family="InterMedium" color="black">
                      {value}
                    </AppText>
                  </View>
                </View>
              ))}
            </View>
          ))
        )}
      </ScrollView>

      <Modal visible={sourceOpen} transparent animationType="fade" onRequestClose={() => setSourceOpen(false)}>
        <Pressable style={styles.sheetOverlay} onPress={() => setSourceOpen(false)}>
          <View style={styles.sheet}>
            <AppText size={16} family="InterSemiBold" color="black">
              Profile picture
            </AppText>
            <Pressable style={styles.sheetRow} onPress={() => pickFrom('camera')}>
              <AppText size={15} family="InterMedium" color="#333333">
                Take a photo
              </AppText>
            </Pressable>
            <Pressable style={styles.sheetRow} onPress={() => pickFrom('gallery')}>
              <AppText size={15} family="InterMedium" color="#333333">
                Choose from gallery
              </AppText>
            </Pressable>
            <Pressable style={[styles.sheetRow, { borderBottomWidth: 0 }]} onPress={() => setSourceOpen(false)}>
              <AppText size={15} family="InterMedium" color="#C25050">
                Cancel
              </AppText>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
};

export default MyProfile;
