import { z } from "zod";

export const ZCalIdDeleteCredentialInputSchema = z.object({
  id: z.number(),
  externalId: z.string().optional(),
  teamId: z.number().optional(),
});

export type TCalIdDeleteCredentialInputSchema = z.infer<typeof ZCalIdDeleteCredentialInputSchema>;
