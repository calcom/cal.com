import { getBookerSlotSnapshotService } from "@calcom/features/slots-analytics/di/BookerSlotSnapshotService.container";
import logger from "@calcom/lib/logger";
import type { TRecordSlotSnapshotInputSchema } from "./recordSlotSnapshot.schema";

const log = logger.getSubLogger({ prefix: ["[slots/recordSlotSnapshot]"] });

export async function recordSlotSnapshotHandler({ input }: { input: TRecordSlotSnapshotInputSchema }) {
  try {
    const service = getBookerSlotSnapshotService();
    await service.recordSnapshot(input);
  } catch (error) {
    log.error("Failed to record slot snapshot", { error, input });
  }
}
