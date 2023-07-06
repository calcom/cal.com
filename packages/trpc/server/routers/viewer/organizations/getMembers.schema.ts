import { z } from "zod";

export const ZGetMembersInput = z.object({
  teamIdToExclude: z.number().optional(),
});

export type TGetMembersInputSchema = z.infer<typeof ZGetMembersInput>;
