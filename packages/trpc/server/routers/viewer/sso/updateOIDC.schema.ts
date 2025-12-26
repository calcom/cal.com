import { z } from "zod";

export type TUpdateOIDCInputSchema = {
  teamId: number | null;
  clientId: string;
  clientSecret: string;
  wellKnownUrl: string;
};

export const ZUpdateOIDCInputSchema = z.object({
  teamId: z.union([z.number(), z.null()]),
  clientId: z.string(),
  clientSecret: z.string(),
  wellKnownUrl: z.string(),
});
