import { VersionValue } from "@nestjs/common/interfaces";

import {
  API_VERSIONS,
  VERSION_2024_04_15,
  VERSION_2024_06_11,
  VERSION_2024_06_14,
} from "@calcom/platform-constants";

export const API_VERSIONS_VALUES: VersionValue = API_VERSIONS as unknown as VersionValue;
export const VERSION_2024_06_14_VALUE: VersionValue = VERSION_2024_06_14 as unknown as VersionValue;
export const VERSION_2024_06_11_VALUE: VersionValue = VERSION_2024_06_11 as unknown as VersionValue;
export const VERSION_2024_04_15_VALUE: VersionValue = VERSION_2024_04_15 as unknown as VersionValue;

export { VERSION_2024_04_15 };
export { VERSION_2024_06_11 };
export { VERSION_2024_06_14 };
