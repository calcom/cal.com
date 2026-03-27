import { z } from "zod";

export const ZListAuthorizedUsersInputSchema = z.object({
  clientId: z.string(),
  page: z.number().min(1).default(1),
  pageSize: z.union([z.literal(50), z.literal(100), z.literal(250)]).default(50),
});

export type TListAuthorizedUsersInputSchema = z.infer<typeof ZListAuthorizedUsersInputSchema>;
