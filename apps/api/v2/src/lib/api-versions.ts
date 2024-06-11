import { VersionValue } from "@nestjs/common/interfaces";

import {
  API_VERSIONS,
  VERSION_2024_04_15,
  VERSION_2024_05_21,
  VERSION_2024_06_11,
} from "@calcom/platform-constants";

export const API_VERSIONS_VALUES: VersionValue = API_VERSIONS as unknown as VersionValue;
export const VERSION_2024_06_11_VALUE: VersionValue = VERSION_2024_06_11 as unknown as VersionValue;
export const VERSION_2024_05_21_VALUE: VersionValue = VERSION_2024_05_21 as unknown as VersionValue;
export const VERSION_2024_04_15_VALUE: VersionValue = VERSION_2024_04_15 as unknown as VersionValue;
