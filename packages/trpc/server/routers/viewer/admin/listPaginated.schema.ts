import { z } from "zod";

export const ZListMembersSchema = z.object({
  limit: z.number().min(1).max(100),
  cursor: z.number().nullish(),
});

export type TListMembersSchema = z.infer<typeof ZListMembersSchema>;
