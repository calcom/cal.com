import { z } from "zod";

export type TCreateInputSchema = {
  teamId?: number;
};

export const ZCreateInputSchema = z.object({
  teamId: z.number().optional(),
});
