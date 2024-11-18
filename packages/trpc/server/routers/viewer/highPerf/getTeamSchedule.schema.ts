import type { z } from "zod";

import { getScheduleSchema } from "../slots/types";

export const ZGetTeamScheduleInputSchema = getScheduleSchema;

export type TGetTeamScheduleInputSchema = z.infer<typeof ZGetTeamScheduleInputSchema>;
