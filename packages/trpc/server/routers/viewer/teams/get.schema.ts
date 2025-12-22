import { z } from "zod";

export type TGetInputSchema = {
  teamId: number;
  isOrg?: boolean;
};

export const ZGetSchema: z.ZodType<TGetInputSchema> = z.object({
  teamId: z.number(),
  isOrg: z.boolean().optional(),
});
