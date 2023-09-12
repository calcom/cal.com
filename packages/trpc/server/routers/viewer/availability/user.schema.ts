import { z } from "zod";

import { stringOrNumber } from "@calcom/prisma/zod-utils";

export const ZUserInputSchema = z.object({
  username: z.string(),
  dateFrom: z.string(),
  dateTo: z.string(),
  eventTypeId: stringOrNumber.optional(),
  withSource: z.boolean().optional(),
});

export type TUserInputSchema = z.infer<typeof ZUserInputSchema>;
