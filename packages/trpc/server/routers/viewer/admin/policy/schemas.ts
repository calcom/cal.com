import { z } from "zod";

import { PolicyType } from "@calcom/prisma/enums";

export const ZCreatePolicyVersionSchema = z.object({
  type: z.nativeEnum(PolicyType),
  version: z.coerce.date(),
  description: z.string().min(1, "Description for US users is required"),
  descriptionNonUS: z.string().min(1, "Description for non-US users is required"),
});

export const ZListPolicyVersionsSchema = z.object({
  type: z.nativeEnum(PolicyType).optional(),
  limit: z.number().min(1).max(100).default(10),
  cursor: z.coerce.date().optional(),
});

export type TCreatePolicyVersionSchema = z.infer<typeof ZCreatePolicyVersionSchema>;
export type TListPolicyVersionsSchema = z.infer<typeof ZListPolicyVersionsSchema>;
