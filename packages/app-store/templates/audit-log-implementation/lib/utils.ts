import { getDefaultAppSettings } from "@calcom/features/audit-logs/constants";
import type { AppSettingOptionEntry } from "@calcom/features/audit-logs/types";

export function getAppSettingsOptions(credentialId: number): AppSettingOptionEntry[] {
  const defaultAppSettings = getDefaultAppSettings(credentialId);
  return [...defaultAppSettings];
}
