import { z } from "zod";

export type TFindKeyOfTypeInputSchema = {
  appId?: string;
  teamId?: number;
};

export const ZFindKeyOfTypeInputSchema = z.object({
  appId: z.string().optional(),
  teamId: z.number().optional(),
});
