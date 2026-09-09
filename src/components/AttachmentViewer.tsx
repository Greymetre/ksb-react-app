import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Linking,
  Modal,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import ReactNativeBlobUtil from 'react-native-blob-util';
import AppText from './AppText/AppText';
import { colors } from '../utils/Colors';

/**
 * react-native-pdf is a native module. A binary built before it was added does not
 * carry it, and importing it at module scope would take the whole app down, so it
 * is loaded defensively and the viewer falls back to opening the file outside.
 */
const PdfView: React.ComponentType<any> | null = (() => {
  try {
    return require('react-native-pdf').default;
  } catch {
    return null;
  }
})();

export type ViewableAttachment = {
  url: string;
  fileName?: string;
  mimeType?: string;
};

const isPdf = (file?: ViewableAttachment) => {
  if (!file) return false;
  if (file.mimeType) return /pdf/i.test(file.mimeType);
  return /\.pdf(\?|$)/i.test(file.url || '');
};

const isRemote = (url: string) => /^https?:\/\//i.test(url);

// A cache name that cannot collide with another attachment, and cannot carry a stray
// character from the server's own file name into a filesystem path.
const cacheNameFor = (url: string) => {
  let hash = 5381;
  for (let i = 0; i < url.length; i += 1) hash = ((hash * 33) ^ url.charCodeAt(i)) >>> 0;
  return `attachment-${hash.toString(16)}.pdf`;
};

const errorText = (error: unknown) => {
  const message = (error as Error)?.message ?? error;
  const text = message == null ? '' : String(message).trim();
  return text || 'please try again';
};

/**
 * Brings a remote PDF down to a local file before the viewer is pointed at it.
 *
 * react-native-pdf can fetch a URL itself, but it does so through react-native-blob-util's
 * own HTTP stack. In the loyalty app that is exactly the fetch that failed on the store
 * build - the same file downloaded perfectly through a different route - and this viewer
 * uses the identical pattern, on a PDF path no device has ever exercised.
 *
 * So the file is fetched with the network the rest of this app already runs on, and
 * written with ReactNativeBlobUtil.fs, which the Sales Performance export has been using
 * in production for months. Both halves are proven; only the untried one is dropped.
 */
const downloadPdf = async (url: string): Promise<string> => {
  const { fs } = ReactNativeBlobUtil;
  const path = `${fs.dirs.CacheDir}/${cacheNameFor(url)}`;
  if (await fs.exists(path)) {
    const stat = await fs.stat(path);
    if (Number(stat?.size ?? 0) > 0) return path;
    await fs.unlink(path);
  }

  const response = await fetch(url);
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

/**
 * Shows one attachment at a time inside the app, whether it is an image or a PDF.
 * When an invoice carries several, the arrows move between them without closing,
 * so the whole set can be read in one go.
 */
export default function AttachmentViewer({
  files,
  index,
  onClose,
}: {
  files: ViewableAttachment[];
  index: number | null;
  onClose: () => void;
}) {
  const [current, setCurrent] = useState(index ?? 0);
  const [loading, setLoading] = useState(true);
  const [pdfPath, setPdfPath] = useState<string | null>(null);
  const [pdfError, setPdfError] = useState<string | null>(null);

  useEffect(() => {
    if (index === null) return;
    setCurrent(index);
    setLoading(true);
  }, [index]);

  // Whichever attachment is on screen. Computed here as well as below, because a hook
  // cannot sit after the early return that follows.
  const shown = index === null || files.length === 0
    ? undefined
    : files[Math.min(Math.max(current, 0), files.length - 1)];
  const shownUrl = shown?.url || '';
  const shownIsPdf = isPdf(shown);

  useEffect(() => {
    if (!shownUrl || !shownIsPdf || !PdfView) return;
    if (!isRemote(shownUrl)) {
      setPdfPath(shownUrl);
      return;
    }

    let alive = true;
    setPdfPath(null);
    setPdfError(null);
    setLoading(true);
    downloadPdf(shownUrl)
      .then((path) => { if (alive) setPdfPath(path); })
      .catch((error) => {
        if (!alive) return;
        setPdfError(errorText(error));
        setLoading(false);
      });
    return () => { alive = false; };
  }, [shownUrl, shownIsPdf]);

  if (index === null || files.length === 0) return null;

  const safeIndex = Math.min(Math.max(current, 0), files.length - 1);
  const file = files[safeIndex];
  const many = files.length > 1;

  const move = (step: number) => {
    setCurrent((value) => (value + step + files.length) % files.length);
    setLoading(true);
  };

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View style={s.backdrop}>
        <View style={s.head}>
          <AppText size={13} family="InterSemiBold" customColor="#fff" style={{ flex: 1 }} numLines={1}>
            {file?.fileName || (isPdf(file) ? 'Invoice PDF' : 'Invoice image')}
            {many ? `   ${safeIndex + 1} / ${files.length}` : ''}
          </AppText>
          <Pressable onPress={onClose} hitSlop={12} style={s.close}>
            <AppText size={20} family="InterSemiBold" customColor="#fff">×</AppText>
          </Pressable>
        </View>

        <View style={s.stage}>
          {isPdf(file) ? (
            PdfView && pdfPath && !pdfError ? (
              <PdfView
                // Already on the device, so nothing here touches the network.
                source={{ uri: pdfPath }}
                style={s.fill}
                onLoadComplete={() => setLoading(false)}
                onError={(error: unknown) => { setPdfError(errorText(error)); setLoading(false); }}
              />
            ) : PdfView && !pdfError ? (
              // Being fetched; the spinner below is already showing.
              <View style={s.fill} />
            ) : (
              // No viewer in this build, or it could not read the file. Either way the
              // phone can still open it - and the reason is named rather than swallowed.
              <View style={s.fallback}>
                <AppText size={40}>📄</AppText>
                <AppText size={13} family="InterMedium" customColor="#fff" style={{ marginTop: 10, textAlign: 'center' }}>
                  {file.fileName || 'Invoice PDF'}
                </AppText>
                {pdfError ? (
                  <AppText size={11.5} family="InterMedium" customColor="rgba(255,255,255,0.7)" style={{ marginTop: 6, textAlign: 'center' }}>
                    {`Could not show it here: ${pdfError}`}
                  </AppText>
                ) : null}
                <Pressable style={s.openButton} onPress={() => Linking.openURL(file.url)}>
                  <AppText size={13} family="InterSemiBold" customColor="#fff">Open</AppText>
                </Pressable>
              </View>
            )
          ) : (
            <Image
              source={{ uri: file.url }}
              style={s.fill}
              resizeMode="contain"
              onLoadEnd={() => setLoading(false)}
            />
          )}

          {loading ? (
            <View style={s.loader} pointerEvents="none">
              <ActivityIndicator color="#fff" />
            </View>
          ) : null}
        </View>

        {many ? (
          <View style={s.nav}>
            <Pressable style={s.navButton} onPress={() => move(-1)}>
              <AppText size={15} family="InterSemiBold" customColor="#fff">‹  Previous</AppText>
            </Pressable>
            <Pressable style={s.navButton} onPress={() => move(1)}>
              <AppText size={15} family="InterSemiBold" customColor="#fff">Next  ›</AppText>
            </Pressable>
          </View>
        ) : null}
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(8,15,26,0.94)' },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 18,
    paddingTop: 54,
    paddingBottom: 12,
  },
  close: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.14)' },
  stage: { flex: 1, margin: 14, borderRadius: 14, overflow: 'hidden', backgroundColor: 'rgba(255,255,255,0.05)' },
  fill: { flex: 1, width: '100%', backgroundColor: 'transparent' },
  loader: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  fallback: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  openButton: { marginTop: 16, paddingHorizontal: 26, height: 44, borderRadius: 12, backgroundColor: colors.blue, alignItems: 'center', justifyContent: 'center' },
  nav: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 18, paddingBottom: 34, gap: 12 },
  navButton: { flex: 1, height: 46, borderRadius: 13, backgroundColor: 'rgba(255,255,255,0.14)', alignItems: 'center', justifyContent: 'center' },
});
