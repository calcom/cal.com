import { z } from "zod";

export type TGetVerifiedNumbersInputSchema = {
  teamId?: number;
};

export const ZGetVerifiedNumbersInputSchema = z.object({
  teamId: z.number().optional(),
});
