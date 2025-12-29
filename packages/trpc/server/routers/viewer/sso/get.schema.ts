import { z } from "zod";

export type TGetInputSchema = {
  teamId: number | null;
};

export const ZGetInputSchema = z.object({
  teamId: z.union([z.number(), z.null()]),
});
