import { Alert } from 'react-native';
import ImageResizer from '@bam.tech/react-native-image-resizer';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
import { errorCodes, isErrorWithCode, pick, types as documentTypes } from '@react-native-documents/picker';

/**
 * Picking and shrinking invoice attachments.
 *
 * The limits mirror Api/Services/InvoiceAttachmentStore.cs. Compressing here rather
 * than on the server means an oversized photo never leaves the phone on a field
 * connection, and the person sees the problem while they can still retake the shot.
 */
export const MAX_INVOICE_ATTACHMENTS = 10;
export const MAX_INVOICE_IMAGE_BYTES = 5 * 1024 * 1024;
export const MAX_INVOICE_PDF_BYTES = 10 * 1024 * 1024;

export type InvoiceAsset = { uri: string; name: string; type: string; size?: number };

const megabytes = (bytes: number) => (bytes / (1024 * 1024)).toFixed(2);

export const isPdfAsset = (asset: { type?: string | null; name?: string | null }) =>
  (asset.type || '').toLowerCase() === 'application/pdf' || /\.pdf$/i.test(asset.name || '');

/** Message shown when a file cannot be brought under the limit. */
export class AttachmentTooLargeError extends Error {}

/**
 * Returns the file unchanged when it already fits, otherwise re-encodes it smaller and
 * smaller until it does. Throws {@link AttachmentTooLargeError} when even the smallest
 * pass is still too big - the API would refuse it anyway.
 */
export async function compressInvoiceAsset(asset: InvoiceAsset): Promise<InvoiceAsset> {
  if (isPdfAsset(asset)) {
    if ((asset.size || 0) > MAX_INVOICE_PDF_BYTES) {
      throw new AttachmentTooLargeError(
        `"${asset.name}" is ${megabytes(asset.size || 0)} MB. A PDF must be ${megabytes(MAX_INVOICE_PDF_BYTES)} MB or less.`,
      );
    }
    return asset;
  }

  if ((asset.size || 0) > 0 && (asset.size as number) <= MAX_INVOICE_IMAGE_BYTES) return asset;

  // Step the longest edge and the JPEG quality down together; the first pass that fits
  // wins, so a barely-oversized photo stays close to its original quality.
  const passes: [number, number][] = [
    [2560, 80],
    [2048, 70],
    [1600, 60],
    [1280, 50],
    [1024, 40],
  ];

  for (const [maxEdge, quality] of passes) {
    try {
      const result = await ImageResizer.createResizedImage(
        asset.uri,
        maxEdge,
        maxEdge,
        'JPEG',
        quality,
        0,
        undefined,
        false,
        { mode: 'contain', onlyScaleDown: true },
      );
      if (result.size <= MAX_INVOICE_IMAGE_BYTES) {
        return {
          uri: result.uri,
          name: asset.name.replace(/\.[^.]+$/, '') + '.jpg',
          type: 'image/jpeg',
          size: result.size,
        };
      }
    } catch {
      // A pass can fail on an odd encoding; the next, smaller one usually succeeds.
    }
  }

  throw new AttachmentTooLargeError(
    `After compression the attachment is greater than ${megabytes(MAX_INVOICE_IMAGE_BYTES)} MB. "${asset.name}" could not be reduced - please attach a smaller file.`,
  );
}

/** Camera, gallery or files - whichever the person chose - as a list of raw assets. */
export async function pickInvoiceAssets(
  source: 'camera' | 'gallery' | 'file',
  limit: number,
): Promise<InvoiceAsset[]> {
  if (source === 'file') {
    const picked = await pick({ type: [documentTypes.pdf, documentTypes.images], allowMultiSelection: true });
    return picked.slice(0, limit).map((file, index) => ({
      uri: file.uri,
      name: file.name || `invoice-${Date.now()}-${index}`,
      type: file.type || 'application/octet-stream',
      size: file.size || 0,
    }));
  }

  const options: any = { mediaType: 'photo', quality: 0.9, includeBase64: false };
  const response =
    source === 'camera'
      ? await launchCamera({ ...options, saveToPhotos: false })
      : await launchImageLibrary({ ...options, selectionLimit: limit });

  if (response?.didCancel) return [];
  if (response?.errorCode) {
    throw new Error(
      response.errorCode === 'camera_unavailable'
        ? 'Camera is not available'
        : response.errorMessage || 'Permission denied',
    );
  }

  return (response?.assets || []).slice(0, limit).map((file: any, index: number) => ({
    uri: file.uri,
    name: file.fileName || `invoice-${Date.now()}-${index}.jpg`,
    type: file.type || 'image/jpeg',
    size: file.fileSize || 0,
  }));
}

/** The three-way source sheet both invoice screens show. */
export function chooseAttachmentSource(onPick: (source: 'camera' | 'gallery' | 'file') => void) {
  Alert.alert('Add attachment', 'Choose a source', [
    { text: 'Camera', onPress: () => onPick('camera') },
    { text: 'Gallery', onPress: () => onPick('gallery') },
    { text: 'Files (PDF)', onPress: () => onPick('file') },
    { text: 'Cancel', style: 'cancel' },
  ]);
}

/** True when the user backed out of the document picker rather than hitting an error. */
export const isPickerCancel = (error: any) =>
  isErrorWithCode(error) && error.code === errorCodes.OPERATION_CANCELED;
