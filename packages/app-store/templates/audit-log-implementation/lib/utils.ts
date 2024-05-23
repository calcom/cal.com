import { getDefaultAppSettings } from "@calcom/features/audit-logs/constants";
import type { AppSettingOptionEntry } from "@calcom/features/audit-logs/types";

export default function getAppSettingsOptions(credentialId: number): AppSettingOptionEntry[] {
  const defaultAppSettings = getDefaultAppSettings(credentialId);
  return [...defaultAppSettings];
}
