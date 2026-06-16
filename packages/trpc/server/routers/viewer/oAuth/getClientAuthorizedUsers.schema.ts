import { z } from "zod";

export const ZGetClientAuthorizedUsersInputSchema = z.object({
  clientId: z.string(),
});

export type TGetClientAuthorizedUsersInputSchema = z.infer<typeof ZGetClientAuthorizedUsersInputSchema>;