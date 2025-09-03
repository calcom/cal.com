import { z } from "zod";

export const routingFormResponseInDbSchema = z.record(
  z.object({
    label: z.string().optional(),
    value: z.union([z.string(), z.number(), z.array(z.string())]),
  })
);
