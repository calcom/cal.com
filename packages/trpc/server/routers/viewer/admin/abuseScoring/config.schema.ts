import { z } from "zod";

export const ZUpdateAbuseScoringConfigInputSchema = z
  .object({
    alertThreshold: z.number().int().min(0).max(100),
    lockThreshold: z.number().int().min(1).max(100),
    monitoringWindowDays: z.number().int().min(1).max(90),
  })
  .refine((data) => data.lockThreshold > data.alertThreshold, {
    message: "Lock threshold must be greater than alert threshold",
    path: ["lockThreshold"],
  });

export type TUpdateAbuseScoringConfigInputSchema = z.infer<typeof ZUpdateAbuseScoringConfigInputSchema>;
