import { z } from "zod";

export const ZListMembersSchema = z.object({
  limit: z.number().min(1).max(100),
  page: z.number().min(1),
});

export type TListMembersSchema = z.infer<typeof ZListMembersSchema>;
