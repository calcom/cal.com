import { z } from "zod";

export const ZGetRoutingFormOptionsInputSchema = z.object({
  teamId: z.number().optional(),
});

export type TGetRoutingFormOptionsInputSchema = z.infer<typeof ZGetRoutingFormOptionsInputSchema>;
