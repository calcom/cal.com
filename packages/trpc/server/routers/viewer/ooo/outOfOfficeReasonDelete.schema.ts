import { z } from "zod";

export const ZOutOfOfficeReasonDelete = z.object({
  reasonId: z.number(),
});

export type TOutOfOfficeReasonDelete = z.infer<typeof ZOutOfOfficeReasonDelete>;
