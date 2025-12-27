import { z } from "zod";

export type THasEditPermissionForUserSchema = {
  memberId: number;
};

export const ZHasEditPermissionForUserSchema = z.object({
  memberId: z.number(),
});
