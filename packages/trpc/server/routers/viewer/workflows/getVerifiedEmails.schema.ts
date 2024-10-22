import { z } from "zod";

export const ZGetVerifiedEmailsInputSchema = z.object({
  teamId: z.number().optional(),
});

export type TGetVerifiedEmailsInputSchema = z.infer<typeof ZGetVerifiedEmailsInputSchema>;
