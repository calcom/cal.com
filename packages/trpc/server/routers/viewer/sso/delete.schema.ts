import { z } from "zod";

export type TDeleteInputSchema = {
  teamId: number | null;
};

export const ZDeleteInputSchema = z.object({
  teamId: z.union([z.number(), z.null()]),
});
