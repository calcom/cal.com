import type { Page } from "@playwright/test";
import { existsSync, statSync } from "fs";
import { join } from "path";

export const STORAGE_STATE_DIR = "apps/web/playwright/state";

export const StorageStates = {
  LOGIN: join(STORAGE_STATE_DIR, "login.json"),
  BOOKINGS: join(STORAGE_STATE_DIR, "login-bookings.json"),
  APPS: join(STORAGE_STATE_DIR, "login-apps.json"),
  SETTINGS: join(STORAGE_STATE_DIR, "login-settings.json"),
  ADMIN: join(STORAGE_STATE_DIR, "login-settings-admin.json"),
} as const;

export async function ensureStorageStateExists(statePath: string): Promise<boolean> {
  return existsSync(statePath);
}

export async function validateStorageState(page: Page, statePath: string): Promise<boolean> {
  try {
    const response = await page.goto("/api/auth/session");
    return response?.status() === 200;
  } catch {
    return false;
  }
}

export async function refreshStorageStateIfNeeded(
  page: Page,
  statePath: string,
  refreshCallback: () => Promise<void>
): Promise<void> {
  const isValid = await validateStorageState(page, statePath);
  if (!isValid) {
    console.log(`Storage state ${statePath} is invalid, refreshing...`);
    await refreshCallback();
    await page.context().storageState({ path: statePath });
  }
}

export function isStorageStateFresh(statePath: string): boolean {
  if (!existsSync(statePath)) return false;

  const stats = statSync(statePath);
  const ageInMs = Date.now() - stats.mtime.getTime();
  const oneHourInMs = 60 * 60 * 1000;

  return ageInMs < oneHourInMs;
}
