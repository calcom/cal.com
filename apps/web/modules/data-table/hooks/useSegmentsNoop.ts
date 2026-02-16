// eslint-disable-next-line no-restricted-imports
import { noop } from "lodash";

import { type UseSegments } from "@calcom/features/data-table/lib/types";

export const useSegmentsNoop: UseSegments = ({}) => {
  return {
    segments: [],
    preferredSegmentId: null,
    isSuccess: false,
    setPreference: noop,
    isSegmentEnabled: false,
  };
};
