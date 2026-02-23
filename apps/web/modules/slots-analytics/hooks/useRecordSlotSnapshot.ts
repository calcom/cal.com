import { computeSlotSnapshot } from "@calcom/features/slots-analytics/lib/computeSlotSnapshot";
import { trpc } from "@calcom/trpc/react";
import { useEffect, useRef } from "react";

interface UseRecordSlotSnapshotParams {
  slots: Record<string, { time: string }[]> | undefined;
  eventTypeId: number | undefined;
  isEmbed: boolean;
  connectVersion: number;
  enableSlotAnalytics: boolean;
}

export function useRecordSlotSnapshot({
  slots,
  eventTypeId,
  isEmbed,
  connectVersion,
  enableSlotAnalytics,
}: UseRecordSlotSnapshotParams) {
  const hasRecorded = useRef(false);
  const mutation = trpc.viewer.slots.recordSlotSnapshot.useMutation({
    onError: () => {
      // Silent failure — analytics should never affect the booker experience
    },
  });

  const hasSlotsLoaded = slots !== undefined && Object.keys(slots).length > 0;

  useEffect(() => {
    if (hasRecorded.current) return;
    if (!enableSlotAnalytics) return;
    if (!isEmbed) return;
    if (connectVersion === 0) return;
    if (!hasSlotsLoaded) return;
    if (!eventTypeId) return;

    hasRecorded.current = true;

    const snapshot = computeSlotSnapshot(slots, eventTypeId);
    if (snapshot) {
      mutation.mutate(snapshot);
    }
  }, [hasSlotsLoaded, connectVersion, isEmbed, enableSlotAnalytics, eventTypeId]);
}
