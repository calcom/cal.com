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

// Formatting utilities
export { formatDuration, truncateTitle, formatAppIdToDisplayName } from "./formatters";

// Storage utilities
export {
  secureStorage,
  generalStorage,
  isChromeStorageAvailable,
  type StorageAdapter,
} from "./storage";

// Query persistence utilities
export { createQueryPersister, clearQueryCache, getCacheMetadata } from "./queryPersister";

// Alert utilities
export { showErrorAlert } from "./alerts";

// Browser utilities
export { openInAppBrowser } from "./browser";

// Network utilities
export { isOnline, subscribeToNetworkChanges } from "./network";

// Slug utilities
export { slugify } from "./slugify";

// App icon utilities
export { getAppIconUrl } from "./getAppIconUrl";

// Default location utilities
export {
  defaultLocations,
  getDefaultLocationIconUrl,
  isDefaultLocation,
  DefaultLocationType,
  type DefaultLocation,
} from "./defaultLocations";

// Location helper utilities
export {
  formatAppIdToDisplayName as formatAppId, // Alias for backward compatibility
  generateLocationId,
  mapApiLocationToItem,
  mapItemToApiLocation,
  getLocationDisplayName,
  getLocationIconUrl,
  createLocationItemFromOption,
  locationRequiresInput,
  getLocationInputType,
  getLocationInputPlaceholder,
  getLocationInputLabel,
  validateLocationItem,
  buildLocationOptions,
  displayNameToLocationValue,
} from "./locationHelpers";

// Event type parser utilities
export {
  parseBufferTime,
  parseMinimumNotice,
  parseFrequencyUnit,
  parseSlotInterval,
} from "./eventTypeParsers";

// Gmail Google Chip parser (for extension)
export {
  parseGoogleChip,
  type GoogleTimeSlot,
  type ParsedGoogleChip,
} from "./gmailGoogleChipParser";
