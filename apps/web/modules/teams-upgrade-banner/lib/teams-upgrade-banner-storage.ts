"use client";

import { localStorage } from "@calcom/lib/webstorage";

const FIRST_SHOWN_KEY = "teams-upgrade-banner-first-shown-at";
const DISMISSED_KEY = "teams-upgrade-banner-dismissed-at";

const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const ONE_MONTH_MS = 30 * 24 * 60 * 60 * 1000;
const THREE_MONTHS_MS = 3 * ONE_MONTH_MS;
const TWELVE_MONTHS_MS = 12 * ONE_MONTH_MS;

function getTimestamp(key: string): number | null {
  const stored = localStorage.getItem(key);
  if (!stored) return null;
  const value = Number(stored);
  if (Number.isNaN(value)) return null;
  return value;
}

export function getTeamsUpgradeBannerFirstShownAt(): number | null {
  return getTimestamp(FIRST_SHOWN_KEY);
}

export function getTeamsUpgradeBannerDismissedAt(): number | null {
  return getTimestamp(DISMISSED_KEY);
}

/** Record the first time the banner was shown (only sets once). */
export function markTeamsUpgradeBannerFirstShown(): void {
  if (getTeamsUpgradeBannerFirstShownAt() === null) {
    localStorage.setItem(FIRST_SHOWN_KEY, String(Date.now()));
  }
}

/** Record that the user dismissed the banner. */
export function setTeamsUpgradeBannerDismissed(): void {
  localStorage.setItem(DISMISSED_KEY, String(Date.now()));
}

/**
 * Determines if the banner is currently in a cooldown period after dismissal.
 *
 * Schedule:
 * - First 3 months after first shown: re-show once per week (7-day cooldown)
 * - Months 3–12: re-show once per month (30-day cooldown)
 * - After 12 months: stop showing permanently
 */
export function isTeamsUpgradeBannerDismissed(): boolean {
  const dismissedAt = getTeamsUpgradeBannerDismissedAt();
  // Never dismissed → not in cooldown
  if (dismissedAt === null) return false;

  const firstShownAt = getTeamsUpgradeBannerFirstShownAt();
  // Safety: if somehow dismissed but no first-shown timestamp, treat as dismissed
  if (firstShownAt === null) return true;

  const now = Date.now();
  const elapsed = now - firstShownAt;

  // After 12 months: stop showing permanently
  if (elapsed >= TWELVE_MONTHS_MS) return true;

  // Determine cooldown based on how long since first shown
  const cooldown = elapsed < THREE_MONTHS_MS ? ONE_WEEK_MS : ONE_MONTH_MS;

  return now - dismissedAt < cooldown;
}
