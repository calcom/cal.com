import { z } from "zod";

const statusSchema = z.enum(["ACCEPT", "DENY"] as const);

export const ZAdminVerifyInput = z.object({
  orgId: z.number(),
  status: statusSchema,
});

export type TAdminVerifyInput = z.infer<typeof ZAdminVerifyInput>;
