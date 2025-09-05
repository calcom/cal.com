import { stringOrNumber } from "@calcom/prisma/zod-utils";
import { z } from "zod";

export const ZUserInputSchema = z.object({
  username: z.string(),
  dateFrom: z.string(),
  dateTo: z.string(),
  eventTypeId: stringOrNumber.optional(),
  withSource: z.boolean().optional(),
});

export type TUserInputSchema = z.infer<typeof ZUserInputSchema>;
