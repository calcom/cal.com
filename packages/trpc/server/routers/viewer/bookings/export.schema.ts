import { z } from "zod";

export const ZExportInputSchema = z.object({
  filters: z.object({
    teamIds: z.number().array().optional(),
    userIds: z.number().array().optional(),
    eventTypeIds: z.number().array().optional(),
    attendees: z.string().array().optional(),
    afterStartDate: z.string().optional(),
    beforeEndDate: z.string().optional(),
  }),
});

export type TExportInputSchema = z.infer<typeof ZExportInputSchema>;
