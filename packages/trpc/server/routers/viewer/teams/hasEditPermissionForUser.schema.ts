import { z } from "zod";

export type THasEditPermissionForUserSchema = {
  memberId: number;
};

export const ZHasEditPermissionForUserSchema: z.ZodType<THasEditPermissionForUserSchema> = z.object({
  memberId: z.number(),
});
