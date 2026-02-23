import { z } from "zod";

export const ZRecordSlotSnapshotInputSchema = z.object({
  eventTypeId: z.number().int().positive(),
  firstSlotLeadTime: z.number().int().min(0),
});

export type TRecordSlotSnapshotInputSchema = z.infer<typeof ZRecordSlotSnapshotInputSchema>;
