import { z } from "zod";

export const ZListMembersInputSchema = z.object({
  teamIds: z.number().array().optional(),
});

export type TListMembersInputSchema = z.infer<typeof ZListMembersInputSchema>;
