import { z } from "zod";

export const ZGetTeamOwnersSchema = z.object({
  teamId: z.number(),
});

export type TGetTeamOwnersInput = z.infer<typeof ZGetTeamOwnersSchema>;
