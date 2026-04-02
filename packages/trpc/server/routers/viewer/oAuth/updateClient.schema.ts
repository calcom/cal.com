import { OAuthClientStatus } from "@calcom/prisma/enums";
import { z } from "zod";

export const ZUpdateClientInputSchema = z
  .object({
    clientId: z.string(),
    status: z.nativeEnum(OAuthClientStatus).optional(),
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
  })
  .superRefine((val, ctx) => {
    if (val.status === OAuthClientStatus.REJECTED && !val.rejectionReason) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["rejectionReason"],
        message: "Rejection reason is required",
      });
    }
  });

export type TUpdateClientInputSchema = z.infer<typeof ZUpdateClientInputSchema>;
