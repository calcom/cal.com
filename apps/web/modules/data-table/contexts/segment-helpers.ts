import type { CombinedFilterSegment, SegmentIdentifier } from "@calcom/features/data-table/lib/types";
import { SYSTEM_SEGMENT_PREFIX } from "@calcom/features/data-table/lib/types";

export function findSegmentById(
  segments: CombinedFilterSegment[],
  segmentIdRaw: string
): CombinedFilterSegment | undefined {
  return segments.find((segment) => {
    if (
      segment.type === "system" &&
      segmentIdRaw.startsWith(SYSTEM_SEGMENT_PREFIX) &&
      segment.id === segmentIdRaw
    ) {
      return true;
    }
    if (segment.type === "user") {
      return segment.id === parseInt(segmentIdRaw, 10);
    }
    return false;
  });
}

export function toSegmentIdObject(segmentIdRaw: string | null): SegmentIdentifier | null {
  if (!segmentIdRaw) return null;
  if (segmentIdRaw.startsWith(SYSTEM_SEGMENT_PREFIX)) {
    return { id: segmentIdRaw, type: "system" };
  }
  const n = parseInt(segmentIdRaw, 10);
  return Number.isNaN(n) ? null : { id: n, type: "user" };
}
