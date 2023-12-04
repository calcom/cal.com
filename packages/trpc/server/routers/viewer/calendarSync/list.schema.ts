import { z } from "zod";

export const ZListCalendarSyncInputSchema = z.object({});

export type TCreateCalendarSyncInputSchema = z.infer<typeof ZListCalendarSyncInputSchema>;
