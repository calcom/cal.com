import { z } from "zod";

export type TValidateLicenseInputSchema = {
  licenseKey: string;
};

export const ZValidateLicenseInputSchema: z.ZodType<TValidateLicenseInputSchema> = z.object({
  licenseKey: z.string().min(1, "License key is required"),
});
