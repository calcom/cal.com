import { z } from "zod";

export const ZInfiniteEventsTypeInputSchema = z.object({
  teamIds: z.number().array().optional(),
  page: z.number().optional(),
  pageSize: z.number().optional(),
});

export type TInfiniteEventTypesInputSchema = z.infer<typeof ZInfiniteEventsTypeInputSchema>;
