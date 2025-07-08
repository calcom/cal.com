import { z } from "zod";

import { getScheduleSchema } from "../slots/types";

export const ZGetTeamScheduleInputSchema = getScheduleSchema.extend({
  allowStale: z.boolean().optional(),
});

export type TGetTeamScheduleInputSchema = z.infer<typeof ZGetTeamScheduleInputSchema>;
