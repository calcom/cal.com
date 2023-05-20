import { z } from "zod";

export const ZFindKeyOfTypeInputSchema = z.object({
  appId: z.string().optional(),
});

export type TFindKeyOfTypeInputSchema = z.infer<typeof ZFindKeyOfTypeInputSchema>;
