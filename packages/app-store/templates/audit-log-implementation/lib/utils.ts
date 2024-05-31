import {
  getDefaultAppSettings,
  getDefaultGeneralSettingsOptions,
} from "@calcom/features/audit-logs/constants";
import type { DefaultAppSettingOptionEntry, GeneralSettingsOption } from "@calcom/features/audit-logs/types";

export function getAppSettingsOptions(credentialId: number): DefaultAppSettingOptionEntry[] {
  const defaultAppSettings = getDefaultAppSettings(credentialId);
  return [...defaultAppSettings];
}

export function getGeneralSettingsOptions(): GeneralSettingsOption[] {
  const defaultOptions = getDefaultGeneralSettingsOptions();
  return [...defaultOptions];
}
