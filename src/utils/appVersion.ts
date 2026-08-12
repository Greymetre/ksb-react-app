import DeviceInfo from 'react-native-device-info';

export const getInstalledAppVersion = (): string => DeviceInfo.getVersion().trim();

export const getDeviceUniqueId = async (): Promise<string> =>
  (await DeviceInfo.getUniqueId()).trim();

const numericParts = (version: string): number[] =>
  version
    .trim()
    .split('.')
    .map(part => Number.parseInt(part, 10))
    .map(part => Number.isFinite(part) ? part : 0);

export const isAppUpdateRequired = (installedVersion: string, requiredVersion: string): boolean => {
  if (!installedVersion.trim() || !requiredVersion.trim()) return false;

  const installed = numericParts(installedVersion);
  const required = numericParts(requiredVersion);
  const length = Math.max(installed.length, required.length);

  for (let index = 0; index < length; index += 1) {
    const installedPart = installed[index] ?? 0;
    const requiredPart = required[index] ?? 0;
    if (installedPart < requiredPart) return true;
    if (installedPart > requiredPart) return false;
  }

  return false;
};
