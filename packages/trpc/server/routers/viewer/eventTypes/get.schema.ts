import { z } from "zod";

export type TGetInputSchema = {
  id: number;
};

export const ZGetInputSchema = z.object({
  id: z.number(),
});
