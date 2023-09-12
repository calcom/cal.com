import type { z } from "zod";

import { getScheduleSchema } from "./types";

export const ZGetScheduleInputSchema = getScheduleSchema;

export type TGetScheduleInputSchema = z.infer<typeof ZGetScheduleInputSchema>;
