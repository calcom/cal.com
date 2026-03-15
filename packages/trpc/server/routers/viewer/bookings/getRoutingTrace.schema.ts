import { z } from "zod";

export const ZGetRoutingTraceInputSchema = z.object({
  bookingUid: z.string(),
});

export type TGetRoutingTraceInputSchema = z.infer<typeof ZGetRoutingTraceInputSchema>;
