import { z } from "zod";

export const ZDeleteCredentialInputSchema = z.object({
  id: z.number(),
  externalId: z.string().optional(),
  teamId: z.number().optional(),
});

export type TDeleteCredentialInputSchema = z.infer<typeof ZDeleteCredentialInputSchema>;
