import { VersionValue } from "@nestjs/common/interfaces";

import {
  API_VERSIONS,
  VERSION_2024_04_15,
  VERSION_2024_06_11,
  VERSION_2024_06_14,
  VERSION_2024_08_13,
  VERSION_2024_09_04,
  VERSION_2025_07_11,
} from "@calcom/platform-constants";

export const API_VERSIONS_VALUES = [...API_VERSIONS];
export const VERSION_2024_06_14_VALUE: VersionValue = VERSION_2024_06_14 as unknown as VersionValue;
export const VERSION_2024_06_11_VALUE: VersionValue = VERSION_2024_06_11 as unknown as VersionValue;
export const VERSION_2024_04_15_VALUE: VersionValue = VERSION_2024_04_15 as unknown as VersionValue;
export const VERSION_2024_08_13_VALUE: VersionValue = VERSION_2024_08_13 as unknown as VersionValue;
export const VERSION_2024_09_04_VALUE: VersionValue = VERSION_2024_09_04 as unknown as VersionValue;
export const VERSION_2025_07_11_VALUE: VersionValue = VERSION_2025_07_11 as unknown as VersionValue;
/**
 * Even when no version header is provided, we default to this version.
 */
export const DEFAULT_API_VERSION: VersionValue = VERSION_2024_04_15 as unknown as VersionValue;

export { VERSION_2024_04_15 };
export { VERSION_2024_06_11 };
export { VERSION_2024_06_14 };
export { VERSION_2024_08_13 };
export { VERSION_2024_09_04 };
export { VERSION_2025_07_11 };
