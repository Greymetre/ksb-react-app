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

  useEffect(() => {
    if (index === null) return;
    setCurrent(index);
    setLoading(true);
  }, [index]);

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
            PdfView ? (
              <PdfView
                source={{ uri: file.url, cache: true }}
                style={s.fill}
                trustAllCerts={false}
                onLoadComplete={() => setLoading(false)}
                onError={() => setLoading(false)}
              />
            ) : (
              // The installed build predates the PDF viewer; hand the file to the phone.
              <View style={s.fallback}>
                <AppText size={40}>📄</AppText>
                <AppText size={13} family="InterMedium" customColor="#fff" style={{ marginTop: 10, textAlign: 'center' }}>
                  {file.fileName || 'Invoice PDF'}
                </AppText>
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
