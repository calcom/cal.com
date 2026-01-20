/**
 * Config Index
 *
 * Central export point for all configuration.
 *
 * @example
 * ```tsx
 * import { CACHE_CONFIG, queryKeys } from '../config';
 * import { getAppBaseUrl, getApiBaseUrl, type Region } from '../config';
 * ```
 */

export { CACHE_CONFIG, queryKeys } from "./cache.config";
export {
  type Region,
  DEFAULT_REGION,
  REGION_STORAGE_KEY,
  REGION_OPTIONS,
  getAppBaseUrl,
  getApiBaseUrl,
  getAssetUrl,
  getSignupUrl,
  getBookingUrl,
  getRescheduleUrl,
  isValidRegion,
  getAppHostnames,
} from "./region";
