import { z } from "zod";

export const ZGetUserAdminTeamsInputSchema = z.object({
  getUserInfo: z.boolean().optional(),
});

export type TGetUserAdminTeamsInputSchema = z.infer<typeof ZGetUserAdminTeamsInputSchema>;
