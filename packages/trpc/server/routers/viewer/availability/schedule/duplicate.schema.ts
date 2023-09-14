import { z } from "zod";

export const ZScheduleDuplicateSchema = z.object({
  scheduleId: z.number(),
});

export type TScheduleDuplicateSchema = z.infer<typeof ZScheduleDuplicateSchema>;
