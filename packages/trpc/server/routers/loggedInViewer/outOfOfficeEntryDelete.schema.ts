import { z } from "zod";

export const ZOutOfOfficeDelete = z.object({
  outOfOfficeUid: z.string(),
  userId: z.number().nullable().optional(),
});

export type TOutOfOfficeDelete = z.infer<typeof ZOutOfOfficeDelete>;
