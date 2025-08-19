/**
 * App Store Registry Abstraction Layer
 *
 * This module provides a level of indirection for accessing the App Store component maps.
 * This abstraction allows for mocking in tests and prepares the codebase for dynamic loading.
 *
 * IMPORTANT: This is part of a performance optimization strategy to resolve issue #23104.
 * The static imports here will be replaced with dynamic imports in subsequent changes.
 */
import { AppSetupMap } from "@calcom/app-store/_pages/setup";
import {
  EventTypeAddonMap,
  EventTypeSettingsMap,
  AppSettingsComponentsMap,
  InstallAppButtonMap,
} from "@calcom/app-store/apps.browser.generated";

/**
 * Registry functions that provide access to the App Store component maps.
 * These functions create a seam that can be mocked in tests, making the
 * transition to dynamic loading seamless for the test suite.
 */

export function getEventTypeAddonMap() {
  return EventTypeAddonMap;
}

export function getEventTypeSettingsMap() {
  return EventTypeSettingsMap;
}

export function getAppSettingsComponentsMap() {
  return AppSettingsComponentsMap;
}

export function getInstallAppButtonMap() {
  return InstallAppButtonMap;
}

export function getAppSetupMap() {
  return AppSetupMap;
}

/**
 * Type exports for maintaining type safety
 */
export type EventTypeAddonMapType = typeof EventTypeAddonMap;
export type EventTypeSettingsMapType = typeof EventTypeSettingsMap;
export type AppSettingsComponentsMapType = typeof AppSettingsComponentsMap;
export type InstallAppButtonMapType = typeof InstallAppButtonMap;
export type AppSetupMapType = typeof AppSetupMap;
