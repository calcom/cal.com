import { z } from "zod";

export const ZSkipTeamTrialsInputSchema = z.object({});

export type TSkipTeamTrialsInputSchema = z.infer<typeof ZSkipTeamTrialsInputSchema>;
