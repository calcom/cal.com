import { z } from "zod";

export const ZFindKeyOfTypeInputSchema = z.object({
  appId: z.string().optional(),
  teamId: z.number().optional(),
});

export type TFindKeyOfTypeInputSchema = z.infer<typeof ZFindKeyOfTypeInputSchema>;
