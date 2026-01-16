import { z } from "zod";

export const ZMassApplyHostLocationInputSchema = z.object({
  eventTypeId: z.number().int(),
  locationType: z.string(),
  link: z.string().optional(),
  address: z.string().optional(),
  phoneNumber: z.string().optional(),
});

export type TMassApplyHostLocationInputSchema = z.infer<typeof ZMassApplyHostLocationInputSchema>;
