import z from "zod";

export const routingStepSchema = z.object({
  domain: z.string(),
  step: z.string(),
  timestamp: z.number(),
  data: z.record(z.unknown()),
});
