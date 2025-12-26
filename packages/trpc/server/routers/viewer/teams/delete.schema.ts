import { z } from "zod";

export type TDeleteInputSchema = {
  teamId: number;
};

export const ZDeleteInputSchema = z.object({
  teamId: z.number(),
});
