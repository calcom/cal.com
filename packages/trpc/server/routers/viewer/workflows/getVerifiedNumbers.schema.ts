import { z } from "zod";

export const ZGetVerifiedNumbersInputSchema = z
  .object({
    teamId: z.number().optional(),
  })
  .optional();

export type TGetVerifiedNumbersInputSchema = z.infer<typeof ZGetVerifiedNumbersInputSchema>;
