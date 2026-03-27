import { z } from "zod";

export const ZCountAuthorizedUsersInputSchema = z.object({
  clientId: z.string(),
});

export type TCountAuthorizedUsersInputSchema = z.infer<typeof ZCountAuthorizedUsersInputSchema>;
