import { z } from "zod";

export type TDeleteInputSchema = {
  id: number;
};

export const ZDeleteInputSchema = z.object({
  id: z.number(),
});
