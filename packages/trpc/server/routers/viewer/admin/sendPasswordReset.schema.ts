import { z } from "zod";

export const ZAdminPasswordResetSchema = z.object({
  userId: z.number(),
});

export type TAdminPasswordResetSchema = z.infer<typeof ZAdminPasswordResetSchema>;
