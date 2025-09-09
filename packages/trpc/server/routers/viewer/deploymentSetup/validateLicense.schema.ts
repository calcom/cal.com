import { z } from "zod";

export const ZValidateLicenseInputSchema = z.object({
  licenseKey: z.string().min(1, "License key is required"),
});

export type TValidateLicenseInputSchema = z.infer<typeof ZValidateLicenseInputSchema>;
