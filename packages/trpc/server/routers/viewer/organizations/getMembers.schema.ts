import { z } from "zod";

export const ZGetMembersInput = z.object({
  teamIdToExclude: z.number().optional(),
  accepted: z.boolean().optional().default(true),
});

export type TGetMembersInputSchema = z.infer<typeof ZGetMembersInput>;
