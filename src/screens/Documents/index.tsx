import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import ReactNativeBlobUtil from 'react-native-blob-util';
import LinearGradient from 'react-native-linear-gradient';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import Toast from 'react-native-toast-message';
import axiosClient, { resolveMediaUrl } from '../../api/AxiosClient';
import AppText from '../../components/AppText/AppText';
import { colors, gradients } from '../../utils/Colors';

/**
 * react-native-pdf is a native module. Loaded defensively, the same way AttachmentViewer
 * does, so a binary built without it falls back to the system viewer instead of crashing.
 */
const PdfView: React.ComponentType<any> | null = (() => {
  try {
    return require('react-native-pdf').default;
  } catch {
    return null;
  }
})();

type AppDocument = {
  id: number;
  name: string;
  fileName: string;
  fileSize: number | null;
  url: string;
  updatedAt: string | null;
};

const BLUE = colors.blue;
const PDF_RED = '#D93A3A';

const toDocument = (row: any): AppDocument => ({
  id: Number(row?.id ?? 0),
  name: String(row?.document_name ?? row?.documentName ?? '').trim() || 'Document',
  fileName: String(row?.file_name ?? row?.fileName ?? '').trim(),
  fileSize: row?.file_size == null ? null : Number(row.file_size),
  url: resolveMediaUrl(row?.file_url ?? row?.fileUrl ?? row?.file_path ?? row?.filePath ?? ''),
  updatedAt: row?.updated_at ?? row?.updatedAt ?? null,
});

const sizeText = (bytes: number | null) => {
  if (!bytes) return '';
  return bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
};

const dateText = (value: string | null) => {
  if (!value) return '';
  const text = String(value);
  // The API sends UTC without a zone marker.
  const date = new Date(/[zZ]|[+-]\d{2}:?\d{2}$/.test(text) ? text : `${text.replace(' ', 'T')}Z`);
  if (Number.isNaN(date.getTime())) return '';
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
};

/** A file name that is safe on disk and still tells the person what it is. */
const saveNameFor = (doc: AppDocument) => {
  const base = doc.name.replace(/[\\/:*?"<>|]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 80) || 'Document';
  return `${base}.pdf`;
};

const errorText = (error: unknown) => {
  const message = (error as any)?.response?.data?.message ?? (error as Error)?.message ?? error;
  const text = message == null ? '' : String(message).trim();
  return text || 'Please try again.';
};

/** Fetched with the app's own network and written with blob-util's fs - the pair that
 *  AttachmentViewer already relies on in production. */
const fetchToCache = async (doc: AppDocument): Promise<string> => {
  const { fs } = ReactNativeBlobUtil;
  const path = `${fs.dirs.CacheDir}/app-document-${doc.id}-${encodeURIComponent(doc.url).length}.pdf`;
  if (await fs.exists(path)) {
    const stat = await fs.stat(path);
    if (Number(stat?.size ?? 0) > 0) return path;
    await fs.unlink(path);
  }
  const response = await fetch(doc.url);
  if (!response.ok) throw new Error(`Server returned ${response.status}`);
  const blob = await response.blob();
  const base64: string = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || '');
      resolve(result.slice(result.indexOf(',') + 1));
    };
    reader.onerror = () => reject(reader.error || new Error('Could not read the download'));
    reader.readAsDataURL(blob);
  });
  if (!base64) throw new Error('The file came back empty');
  await fs.writeFile(path, base64, 'base64');
  return path;
};

/** Android 10+: into the public Downloads folder through MediaStore, which needs no storage
 *  permission. Older Android: the path the order PDF has always used - a copy in Downloads,
 *  announced by the download notification. iOS: the Quick Look sheet, whose Share button
 *  saves to Files. */
const saveToDevice = async (doc: AppDocument) => {
  const cached = await fetchToCache(doc);
  const { fs } = ReactNativeBlobUtil;
  const fileName = saveNameFor(doc);
  if (Platform.OS === 'android') {
    if (Number(Platform.Version) >= 29) {
      await ReactNativeBlobUtil.MediaCollection.copyToMediaStore(
        { name: fileName, parentFolder: '', mimeType: 'application/pdf' },
        'Download',
        cached,
      );
      return 'Saved to Downloads';
    }
    const target = `${fs.dirs.DownloadDir}/${fileName}`;
    if (await fs.exists(target)) await fs.unlink(target);
    await fs.cp(cached, target);
    await ReactNativeBlobUtil.android.addCompleteDownload({
      title: fileName,
      description: 'Document downloaded',
      mime: 'application/pdf',
      path: target,
      showNotification: true,
    });
    return 'Saved to Downloads';
  }
  const target = `${fs.dirs.DocumentDir}/${fileName}`;
  if (await fs.exists(target)) await fs.unlink(target);
  await fs.cp(cached, target);
  ReactNativeBlobUtil.ios.previewDocument(target);
  return 'Use Share > Save to Files to keep a copy';
};

const Documents = () => {
  const [documents, setDocuments] = useState<AppDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [downloadingId, setDownloadingId] = useState<number | null>(null);
  const [downloadedIds, setDownloadedIds] = useState<number[]>([]);
  const [viewing, setViewing] = useState<AppDocument | null>(null);

  const load = useCallback(async (refresh = false) => {
    refresh ? setRefreshing(true) : setLoading(true);
    setError(null);
    try {
      const response = await axiosClient.get('api/fieldkonnect/app-documents');
      const rows = Array.isArray(response?.data?.data) ? response.data.data : [];
      setDocuments(rows.map(toDocument).filter((doc: AppDocument) => doc.url));
    } catch (e) {
      setError(errorText(e));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const shown = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return documents;
    return documents.filter(doc => doc.name.toLowerCase().includes(term) || doc.fileName.toLowerCase().includes(term));
  }, [documents, search]);

  const download = async (doc: AppDocument) => {
    if (downloadingId) return;
    setDownloadingId(doc.id);
    try {
      const where = await saveToDevice(doc);
      setDownloadedIds(ids => (ids.includes(doc.id) ? ids : [...ids, doc.id]));
      Toast.show({ type: 'success', text1: 'Document downloaded', text2: where });
    } catch (e) {
      Toast.show({ type: 'error', text1: 'Download failed', text2: errorText(e) });
    } finally {
      setDownloadingId(null);
    }
  };

  const header = (
    <View>
      {/* The gradient only paints the background. Given the padding and the clipping itself,
          it drew a box smaller than its layout and cut the icon and title off. */}
      <View style={styles.hero}>
        <LinearGradient colors={gradients.brand} locations={gradients.stops} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
        <View style={styles.heroRing} />
        <View style={styles.heroIcon}><FolderIcon /></View>
        <View style={{ flex: 1 }}>
          <AppText size={20} family="InterBold" color="white">Documents</AppText>
          <AppText size={13} family="InterMedium" color="white" opacity={0.85} style={{ marginTop: 3 }}>
            {loading ? 'Loading your documents...' : `${documents.length} ${documents.length === 1 ? 'document' : 'documents'} shared with you`}
          </AppText>
        </View>
      </View>

      {documents.length > 0 && (
        <View style={styles.searchBox}>
          <SearchIcon />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search documents"
            placeholderTextColor="#94A3B8"
            style={styles.searchInput}
            returnKeyType="search"
          />
          {search ? (
            <Pressable hitSlop={10} onPress={() => setSearch('')}>
              <AppText size={18} color="#94A3B8">×</AppText>
            </Pressable>
          ) : null}
        </View>
      )}
    </View>
  );

  const empty = loading ? (
    <View style={styles.center}>
      <ActivityIndicator size="large" color={BLUE} />
      <AppText size={14} family="InterMedium" color={BLUE} style={{ marginTop: 10 }}>Loading documents...</AppText>
    </View>
  ) : error ? (
    <View style={styles.center}>
      <View style={styles.emptyIcon}><AppText size={28}>⚠️</AppText></View>
      <AppText size={16} family="InterSemiBold" color="#1E293B">Couldn't load documents</AppText>
      <AppText size={13} color="#64748B" align="center" style={{ marginTop: 6 }}>{error}</AppText>
      <Pressable style={styles.retry} onPress={() => load()}>
        <AppText size={14} family="InterSemiBold" color="white">Try again</AppText>
      </Pressable>
    </View>
  ) : (
    <View style={styles.center}>
      <View style={styles.emptyIcon}><FolderIcon color={BLUE} /></View>
      <AppText size={16} family="InterSemiBold" color="#1E293B">
        {search ? 'No matching documents' : 'No documents yet'}
      </AppText>
      <AppText size={13} color="#64748B" align="center" style={{ marginTop: 6 }}>
        {search ? 'Try a different name.' : 'Documents shared by the office will appear here.'}
      </AppText>
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={shown}
        keyExtractor={item => String(item.id)}
        ListHeaderComponent={header}
        ListEmptyComponent={empty}
        contentContainerStyle={styles.list}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} colors={[BLUE]} tintColor={BLUE} />}
        renderItem={({ item }) => {
          const busy = downloadingId === item.id;
          const done = downloadedIds.includes(item.id);
          const meta = ['PDF', sizeText(item.fileSize), dateText(item.updatedAt) && `Updated ${dateText(item.updatedAt)}`].filter(Boolean).join('  ·  ');
          return (
            <Pressable style={({ pressed }) => [styles.card, pressed && styles.cardPressed]} onPress={() => setViewing(item)}>
              <View style={styles.cardTop}>
                <View style={styles.pdfTile}>
                  <PdfFileIcon />
                </View>
                <View style={styles.cardText}>
                  <AppText size={15} family="InterSemiBold" color="#1E293B" numLines={2}>{item.name}</AppText>
                  <AppText size={12} family="InterMedium" color="#64748B" style={{ marginTop: 4 }} numLines={1}>{meta}</AppText>
                </View>
              </View>
              <View style={styles.actions}>
                <Pressable style={({ pressed }) => [styles.actionBtn, styles.viewBtn, pressed && styles.btnPressed]} onPress={() => setViewing(item)}>
                  <EyeIcon />
                  <AppText size={13} family="InterSemiBold" color={BLUE}>View</AppText>
                </Pressable>
                <Pressable
                  style={({ pressed }) => [styles.actionBtn, done ? styles.doneBtn : styles.downloadBtn, pressed && styles.btnPressed]}
                  onPress={() => download(item)}
                  disabled={busy}
                >
                  {busy ? <ActivityIndicator size="small" color="white" /> : done ? <CheckIcon /> : <DownloadIcon />}
                  <AppText size={13} family="InterSemiBold" color="white">{busy ? 'Downloading...' : done ? 'Downloaded' : 'Download'}</AppText>
                </Pressable>
              </View>
            </Pressable>
          );
        }}
      />

      <DocumentViewer
        document={viewing}
        downloading={viewing ? downloadingId === viewing.id : false}
        onDownload={() => viewing && download(viewing)}
        onClose={() => setViewing(null)}
      />
    </View>
  );
};

function DocumentViewer({ document, downloading, onDownload, onClose }: {
  document: AppDocument | null;
  downloading: boolean;
  onDownload: () => void;
  onClose: () => void;
}) {
  const [path, setPath] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(0);

  useEffect(() => {
    if (!document) return;
    let alive = true;
    setPath(null);
    setError(null);
    setPage(1);
    setPages(0);
    fetchToCache(document)
      .then(local => { if (alive) setPath(local); })
      .catch(e => { if (alive) setError(errorText(e)); });
    return () => { alive = false; };
  }, [document]);

  const openOutside = async () => {
    if (!path) return;
    try {
      if (Platform.OS === 'ios') ReactNativeBlobUtil.ios.previewDocument(path);
      else await ReactNativeBlobUtil.android.actionViewIntent(path, 'application/pdf');
    } catch (e) {
      Toast.show({ type: 'error', text1: 'Could not open the document', text2: errorText(e) });
    }
  };

  return (
    <Modal visible={!!document} animationType="slide" onRequestClose={onClose} presentationStyle="fullScreen" statusBarTranslucent>
      {/* A Modal is its own native window: without a provider of its own the safe-area
          insets read 0 there, and the bar slid under the status bar where iOS swallows
          the taps - the close button did nothing. */}
      <SafeAreaProvider>
      <SafeAreaView style={styles.viewer} edges={['top', 'bottom']}>
        <View style={styles.viewerBar}>
          <Pressable hitSlop={12} style={styles.viewerIconBtn} onPress={onClose}>
            <AppText size={24} color="white" style={{ lineHeight: 26 }}>×</AppText>
          </Pressable>
          <View style={{ flex: 1, marginHorizontal: 10 }}>
            <AppText size={16} family="InterSemiBold" color="white" numLines={1}>{document?.name}</AppText>
            {pages > 0 && <AppText size={12} family="InterMedium" color="white" opacity={0.8}>Page {page} of {pages}</AppText>}
          </View>
          <Pressable hitSlop={12} style={styles.viewerIconBtn} onPress={onDownload} disabled={downloading}>
            {downloading ? <ActivityIndicator size="small" color="white" /> : <DownloadIcon />}
          </Pressable>
        </View>

        <View style={styles.viewerBody}>
          {error ? (
            <View style={styles.center}>
              <AppText size={16} family="InterSemiBold" color="#1E293B">Couldn't open the document</AppText>
              <AppText size={13} color="#64748B" align="center" style={{ marginTop: 6 }}>{error}</AppText>
            </View>
          ) : !path ? (
            <View style={styles.center}>
              <ActivityIndicator size="large" color={BLUE} />
              <AppText size={14} family="InterMedium" color={BLUE} style={{ marginTop: 10 }}>Opening document...</AppText>
            </View>
          ) : PdfView ? (
            <PdfView
              source={{ uri: Platform.OS === 'android' ? `file://${path}` : path }}
              style={styles.pdf}
              trustAllCerts={false}
              onLoadComplete={(count: number) => setPages(count)}
              onPageChanged={(current: number, count: number) => { setPage(current); setPages(count); }}
              onError={(e: unknown) => setError(errorText(e))}
            />
          ) : (
            <View style={styles.center}>
              <AppText size={14} color="#64748B" align="center">The in-app viewer is not available in this version.</AppText>
              <Pressable style={styles.retry} onPress={openOutside}>
                <AppText size={14} family="InterSemiBold" color="white">Open document</AppText>
              </Pressable>
            </View>
          )}
        </View>
      </SafeAreaView>
      {/* A toast from the screen underneath would be hidden behind this modal on iOS. */}
      <Toast />
      </SafeAreaProvider>
    </Modal>
  );
}

const FolderIcon = ({ color = 'white' }: { color?: string }) => (
  <Svg width={26} height={26} viewBox="0 0 24 24" fill="none">
    <Path d="M3 7.5A2.5 2.5 0 0 1 5.5 5h3.6l2 2h7.4A2.5 2.5 0 0 1 21 9.5v8a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 17.5v-10Z" stroke={color} strokeWidth={1.8} strokeLinejoin="round" />
    <Path d="M8 13h8M8 16h5" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
  </Svg>
);

const PdfFileIcon = () => (
  <Svg width={30} height={34} viewBox="0 0 30 34" fill="none">
    <Path d="M4 3a3 3 0 0 1 3-3h13l8 8v23a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3V3Z" fill="#FFFFFF" />
    <Path d="M20 0l8 8h-5a3 3 0 0 1-3-3V0Z" fill="#F7B5B5" />
    <Rect x={0} y={15} width={22} height={11} rx={2.5} fill={PDF_RED} />
    <Path d="M3.6 23.4v-5.8h2.1c1.3 0 2 .7 2 1.8s-.7 1.8-2 1.8h-1v2.2H3.6Zm1.1-3.1h.9c.6 0 .9-.3.9-.9s-.3-.9-.9-.9h-.9v1.8Zm4 3.1v-5.8h1.9c1.8 0 2.8 1.1 2.8 2.9s-1 2.9-2.8 2.9H8.7Zm1.1-1h.8c1.1 0 1.7-.7 1.7-1.9s-.6-1.9-1.7-1.9h-.8v3.8Zm4.2 1v-5.8h3.6v1h-2.5v1.4h2.3v1h-2.3v2.4H14Z" fill="#FFFFFF" />
  </Svg>
);

const EyeIcon = () => (
  <Svg width={17} height={17} viewBox="0 0 24 24" fill="none">
    <Path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z" stroke={BLUE} strokeWidth={2} strokeLinejoin="round" />
    <Circle cx={12} cy={12} r={3} stroke={BLUE} strokeWidth={2} />
  </Svg>
);

const DownloadIcon = () => (
  <Svg width={17} height={17} viewBox="0 0 24 24" fill="none">
    <Path d="M12 4v11m0 0 4.5-4.5M12 15l-4.5-4.5M4 19.5h16" stroke="white" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const CheckIcon = () => (
  <Svg width={17} height={17} viewBox="0 0 24 24" fill="none">
    <Path d="m5 12.5 4.5 4.5L19 7.5" stroke="white" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const SearchIcon = () => (
  <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
    <Circle cx={11} cy={11} r={6.5} stroke="#94A3B8" strokeWidth={2} />
    <Path d="m16 16 4 4" stroke="#94A3B8" strokeWidth={2} strokeLinecap="round" />
  </Svg>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent' },
  list: { padding: 16, paddingBottom: 32, flexGrow: 1 },
  hero: {
    borderRadius: 18,
    padding: 18,
    minHeight: 86,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    overflow: 'hidden',
    marginBottom: 14,
  },
  heroRing: {
    position: 'absolute',
    right: -40,
    top: -50,
    width: 150,
    height: 150,
    borderRadius: 75,
    borderWidth: 24,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  heroIcon: {
    width: 50,
    height: 50,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 46,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: 'white',
    marginBottom: 14,
  },
  searchInput: { flex: 1, fontSize: 14, color: '#1E293B', paddingVertical: 0 },
  card: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E8EDF5',
    shadowColor: '#0F172A',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  cardPressed: { opacity: 0.92 },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  pdfTile: {
    width: 54,
    height: 58,
    borderRadius: 12,
    backgroundColor: '#FDECEC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardText: { flex: 1 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 14 },
  actionBtn: {
    flex: 1,
    height: 40,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },
  viewBtn: { borderWidth: 1.2, borderColor: '#EAD9B8', backgroundColor: '#FDF9F1' },
  downloadBtn: { backgroundColor: BLUE },
  doneBtn: { backgroundColor: '#16A34A' },
  btnPressed: { opacity: 0.8 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 60, paddingHorizontal: 24 },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: '#FAF0DD',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  retry: { marginTop: 16, backgroundColor: BLUE, borderRadius: 10, paddingHorizontal: 22, paddingVertical: 11 },
  viewer: { flex: 1, backgroundColor: BLUE },
  viewerBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10 },
  viewerIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewerBody: { flex: 1, backgroundColor: '#E9EDF3' },
  pdf: { flex: 1, backgroundColor: '#E9EDF3' },
});

export default Documents;
