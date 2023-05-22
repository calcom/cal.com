import { z } from "zod";

export const ZUpdateOIDCInputSchema = z.object({
  teamId: z.union([z.number(), z.null()]),
  clientId: z.string(),
  clientSecret: z.string(),
  wellKnownUrl: z.string(),
});

export type TUpdateOIDCInputSchema = z.infer<typeof ZUpdateOIDCInputSchema>;
