import { z } from "zod";

import { OAuthClientApprovalStatus } from "@calcom/prisma/enums";

export const ZUpdateClientInputSchema = z.object({
  clientId: z.string(),
  status: z.nativeEnum(OAuthClientApprovalStatus).optional(),
  rejectionReason: z.string().min(1).optional(),
  name: z.string().min(1).optional(),
  purpose: z.string().min(1).optional(),
  redirectUri: z.string().url().optional(),
  logo: z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? null : value),
    z.string().nullable().optional()
  ),
  websiteUrl: z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? null : value),
    z.string().url().nullable().optional()
  ),
});

export type TUpdateClientInputSchema = z.infer<typeof ZUpdateClientInputSchema>;

export const ZUpdateClientStatusInputSchema = z.object({
  clientId: z.string(),
  status: z.nativeEnum(OAuthClientApprovalStatus),
  rejectionReason: z.string().min(1).optional(),
}).superRefine((val, ctx) => {
  if (val.status === OAuthClientApprovalStatus.REJECTED && !val.rejectionReason) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["rejectionReason"],
      message: "Rejection reason is required",
    });
  }
});

export type TUpdateClientStatusInputSchema = z.infer<typeof ZUpdateClientStatusInputSchema>;
