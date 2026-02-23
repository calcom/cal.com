import { getBookerSlotSnapshotService } from "@calcom/features/slots-analytics/di/BookerSlotSnapshotService.container";
import { checkRateLimitAndThrowError } from "@calcom/lib/checkRateLimitAndThrowError";
import getIP from "@calcom/lib/getIP";
import logger from "@calcom/lib/logger";
import type { NextApiRequest } from "next";
import type { TRecordSlotSnapshotInputSchema } from "./recordSlotSnapshot.schema";

const log = logger.getSubLogger({ prefix: ["[slots/recordSlotSnapshot]"] });

export async function recordSlotSnapshotHandler({
  input,
  ctx,
}: {
  input: TRecordSlotSnapshotInputSchema;
  ctx: { req?: { headers: Record<string, string | string[] | undefined> } };
}) {
  try {
    const ip = ctx.req ? getIP(ctx.req as NextApiRequest) : "unknown";
    await checkRateLimitAndThrowError({
      rateLimitingType: "core",
      identifier: `recordSlotSnapshot:${ip}`,
    });

    const service = getBookerSlotSnapshotService();
    await service.recordSnapshot(input);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    log.error("Failed to record slot snapshot", { message, eventTypeId: input.eventTypeId });
  }
}
