// eslint-disable-next-line no-restricted-imports

import type { UseSegments } from "@calcom/features/data-table/lib/types";
import { noop } from "lodash";

export const useSegmentsNoop: UseSegments = ({}) => {
  return {
    segments: [],
    preferredSegmentId: null,
    isSuccess: false,
    setPreference: noop,
    isSegmentEnabled: false,
  };
};
