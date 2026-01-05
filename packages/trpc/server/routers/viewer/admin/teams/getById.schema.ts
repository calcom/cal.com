import { z } from "zod";

export const ZGetTeamByIdSchema = z.object({
  teamId: z.number(),
});

export type TGetTeamByIdSchema = z.infer<typeof ZGetTeamByIdSchema>;
