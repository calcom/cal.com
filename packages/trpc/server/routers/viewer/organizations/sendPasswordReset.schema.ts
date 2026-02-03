import { z } from "zod";

export const ZOrgPasswordResetSchema = z.object({
  userId: z.number(),
});

export type TOrgPasswordResetSchema = z.infer<typeof ZOrgPasswordResetSchema>;
