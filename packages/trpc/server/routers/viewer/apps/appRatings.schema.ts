import { z } from "zod";

export const ZAppRatingsInputSchema = z.object({
  appSlug: z.string(),
  take: z.number().min(1).max(100).optional().default(50),
  skip: z.number().min(0).optional().default(0),
});

export type TAppRatingsInputSchema = z.infer<typeof ZAppRatingsInputSchema>;
