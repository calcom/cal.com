import { z } from "zod";

export const ZResizeOnboardingImageInputSchema = z.object({
  image: z.string().min(1, "Image is required"),
  isBanner: z.boolean().default(false),
});

export type TResizeOnboardingImageInputSchema = z.infer<typeof ZResizeOnboardingImageInputSchema>;
