import { z } from "zod";

export type TUpdateInputSchema = {
  licenseKey?: string;
  signatureToken?: string;
};

export const ZUpdateInputSchema = z.object({
  licenseKey: z.string().optional(),
  signatureToken: z.string().optional(),
});
