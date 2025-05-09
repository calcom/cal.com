import { z } from "zod";

export const ZAdminVerifyWorkflowsSchema = z.object({
  userId: z.number(),
});

export type TAdminVerifyWorkflowsSchema = z.infer<typeof ZAdminVerifyWorkflowsSchema>;
