import { z } from "zod";

export const ZUploadOnboardingImageSchema = z.object({
  imageData: z.string(),
  type: z.enum(["logo", "banner"]),
});

export type TUploadOnboardingImageSchema = z.infer<typeof ZUploadOnboardingImageSchema>;
