import { z } from "zod";

export const ZTestCallInputSchema = z.object({
  agentId: z.string(),
  phoneNumber: z.string().optional(),
  teamId: z.number().optional(),
  eventTypeId: z.number(),
});

export type TTestCallInputSchema = z.infer<typeof ZTestCallInputSchema>;
