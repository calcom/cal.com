import { z } from "zod";

export type TGetVerifiedEmailsInputSchema = {
  teamId?: number;
};

export const ZGetVerifiedEmailsInputSchema = z.object({
  teamId: z.number().optional(),
});
