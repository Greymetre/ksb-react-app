import { createMMKV } from 'react-native-mmkv';

/**
 * Google Play "Prominent Disclosure and Consent": before the app asks the system for any
 * location permission, it must show an in-app disclosure that says what location data is
 * collected, why, and that it is collected in the background / while the app is closed, and
 * the user must affirmatively accept it. This module is the single gate every location
 * permission request goes through so the disclosure is never bypassed.
 *
 * The disclosure UI lives in LocationDisclosureHost (mounted once at the app root). The gate
 * and the UI talk through the listener below so a service (no React tree) can still raise it.
 */
const storage = createMMKV({ id: 'live-location-permission-storage' });
const CONSENT_KEY = 'location_prominent_disclosure_accepted_v1';

type VisibilityListener = (visible: boolean) => void;

let listener: VisibilityListener | null = null;
let pendingResolve: ((accepted: boolean) => void) | null = null;

export const hasLocationConsent = () => storage.getBoolean(CONSENT_KEY) === true;

/**
 * Resolves true only once the user has accepted the disclosure. If consent was already given
 * it resolves immediately; otherwise it shows the disclosure and waits for the user's choice.
 * If the host is not mounted yet (and consent was never given) it resolves false so we never
 * request a location permission without the disclosure on screen.
 */
export const ensureLocationConsent = (): Promise<boolean> => {
  if (hasLocationConsent()) return Promise.resolve(true);
  if (!listener) return Promise.resolve(false);
  // A disclosure is already on screen: reuse its promise rather than stacking a second one.
  if (pendingResolve) return Promise.resolve(false);
  return new Promise<boolean>(resolve => {
    pendingResolve = resolve;
    listener?.(true);
  });
};

/** Internal: the host registers/unregisters its visibility setter here. */
export const registerDisclosureListener = (next: VisibilityListener | null) => {
  listener = next;
};

/** Internal: the host calls this when the user accepts or declines. */
export const resolveLocationConsent = (accepted: boolean) => {
  if (accepted) storage.set(CONSENT_KEY, true);
  listener?.(false);
  const resolve = pendingResolve;
  pendingResolve = null;
  resolve?.(accepted);
};
