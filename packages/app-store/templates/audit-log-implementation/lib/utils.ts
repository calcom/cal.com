import { getDefaultAppSettings } from "@calcom/features/audit-logs/constants";

export function getAppSettingsOptions(credentialId: number): AppSettingOptionEntry[] {
  const defaultAppSettings = getDefaultAppSettings(credentialId);
  return [...defaultAppSettings];
}
