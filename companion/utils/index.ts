/**
 * Utils Index
 *
 * Central export point for all utility functions.
 * Import utilities from this file for clean imports:
 *
 * @example
 * ```tsx
 * import { formatDuration, secureStorage, parseBufferTime } from '../utils';
 * ```
 */

// Alert utilities
export { setGlobalToastFunction, showErrorAlert, showInfoAlert, showSuccessAlert } from "./alerts";
// Browser utilities
export { openInAppBrowser } from "./browser";
// Default location utilities
export {
  type DefaultLocation,
  DefaultLocationType,
  defaultLocations,
  getDefaultLocationIconUrl,
  isDefaultLocation,
} from "./defaultLocations";
// Event type parser utilities
export {
  parseBufferTime,
  parseFrequencyUnit,
  parseMinimumNotice,
  parseSlotInterval,
} from "./eventTypeParsers";
// Formatting utilities
export { formatAppIdToDisplayName, formatDuration, truncateTitle } from "./formatters";
// App icon utilities
export { getAppIconUrl } from "./getAppIconUrl";
// Avatar utilities
export { getAvatarUrl } from "./getAvatarUrl";
// Gmail Google Chip parser (for extension)
export {
  type GoogleTimeSlot,
  type ParsedGoogleChip,
  parseGoogleChip,
} from "./gmailGoogleChipParser";
// Location helper utilities
export {
  buildLocationOptions,
  createLocationItemFromOption,
  displayNameToLocationValue,
  formatAppIdToDisplayName as formatAppId, // Alias for backward compatibility
  generateLocationId,
  getLocationDisplayName,
  getLocationIconUrl,
  getLocationInputLabel,
  getLocationInputPlaceholder,
  getLocationInputType,
  locationRequiresInput,
  mapApiLocationToItem,
  mapItemToApiLocation,
  validateLocationItem,
} from "./locationHelpers";
// Network utilities
export { fetchWithTimeout, isOnline } from "./network";
// Query persistence utilities
export { clearQueryCache, createQueryPersister, getCacheMetadata } from "./queryPersister";
// Safe logging utilities
export { getSafeErrorMessage, safeLogError, safeLogInfo, safeLogWarn } from "./safeLogger";
// Slug utilities
export { slugify } from "./slugify";
// Storage utilities
export {
  generalStorage,
  isChromeStorageAvailable,
  type StorageAdapter,
  secureStorage,
} from "./storage";
