import { z } from "zod";

export const ZHasEditPermissionForUserSchema = z.object({
  // memberId: z.number(),
  calIdMemberId: z.number(),
});

export type THasEditPermissionForUserSchema = z.infer<typeof ZHasEditPermissionForUserSchema>;
