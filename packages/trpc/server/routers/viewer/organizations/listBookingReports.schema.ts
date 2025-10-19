import { z } from "zod";

export const ZListBookingReportsInputSchema = z.object({
  limit: z.number().min(1).max(100).default(25),
  offset: z.number().min(0).default(0),
  searchTerm: z.string().optional(),
});

export type TListBookingReportsInputSchema = z.infer<typeof ZListBookingReportsInputSchema>;
