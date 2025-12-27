import { z } from "zod";

export type TValidateLicenseInputSchema = {
  licenseKey: string;
};

export const ZValidateLicenseInputSchema = z.object({
  licenseKey: z.string().min(1, "License key is required"),
});
