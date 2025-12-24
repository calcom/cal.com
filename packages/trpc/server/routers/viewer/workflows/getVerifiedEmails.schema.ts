import { z } from "zod";

export type TGetVerifiedEmailsInputSchema = {
  teamId?: number;
};

export const ZGetVerifiedEmailsInputSchema: z.ZodType<TGetVerifiedEmailsInputSchema> = z.object({
  teamId: z.number().optional(),
});
