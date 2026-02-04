import { z } from "zod";

import { MONTHLY_PRORATION_BATCH_SIZE } from "../constants";

const monthKeyRegex = /^\d{4}-(0[1-9]|1[0-2])$/;

export const monthlyProrationBatchSchema = z.object({
  monthKey: z.string().regex(monthKeyRegex),
  teamIds: z.array(z.number()).min(1).max(MONTHLY_PRORATION_BATCH_SIZE),
});
