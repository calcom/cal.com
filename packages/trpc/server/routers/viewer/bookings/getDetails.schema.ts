import { z } from "zod";

export const ZGetDetailsInputSchema = z.object({
  uid: z.string(),
  seatReferenceUid: z.string().optional(),
  eventTypeSlug: z.string().optional(),
});

export type TGetDetailsInputSchema = z.infer<typeof ZGetDetailsInputSchema>;
