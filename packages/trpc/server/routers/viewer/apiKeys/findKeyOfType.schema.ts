import { z } from "zod";

export type TFindKeyOfTypeInputSchema = {
  appId?: string;
  teamId?: number;
};

export const ZFindKeyOfTypeInputSchema: z.ZodType<TFindKeyOfTypeInputSchema> = z.object({
  appId: z.string().optional(),
  teamId: z.number().optional(),
});
