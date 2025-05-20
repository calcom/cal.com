import { useMemo } from "react";

import {
  type FilterSegmentOutput,
  type UseSegments,
  type UseSegmentsProps,
  type UseSegmentsReturn,
} from "../lib/types";

export function useSegmentsWithProp(
  segments: FilterSegmentOutput[] | undefined,
  useSegmentsHook: UseSegments,
  props: UseSegmentsProps
): UseSegmentsReturn {
  const providedSegmentsReturn = useMemo((): UseSegmentsReturn | undefined => {
    if (!segments) return undefined;

    return {
      segments,
      selectedSegment: segments.find((segment) => segment.id === props.segmentId),
      canSaveSegment: false, // Can't save when using provided segments
      setAndPersistSegmentId: props.setSegmentId, // Just use the regular setter without persisting
      isSegmentEnabled: true,
    };
  }, [segments, props.segmentId, props.setSegmentId]);

  const fetchedSegmentsReturn = useSegmentsHook(props);

  return providedSegmentsReturn ?? fetchedSegmentsReturn;
}
