import { z } from "zod";

export const ZGetEventTypeHostsInputSchema = z.object({
  eventTypeId: z.number(),
  limit: z.number().min(1).max(100).default(10),
  cursor: z.number().nullish(),
  searchQuery: z.string().optional(),
});

export type TGetEventTypeHostsInputSchema = z.infer<typeof ZGetEventTypeHostsInputSchema>;
