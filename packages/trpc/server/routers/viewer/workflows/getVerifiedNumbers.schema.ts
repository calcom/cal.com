import { z } from "zod";

export type TGetVerifiedNumbersInputSchema = {
  teamId?: number;
};

export const ZGetVerifiedNumbersInputSchema: z.ZodType<TGetVerifiedNumbersInputSchema> = z.object({
  teamId: z.number().optional(),
});
