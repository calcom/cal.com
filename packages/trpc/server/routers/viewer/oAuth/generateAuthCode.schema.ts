import { z } from "zod";

export const ZGenerateAuthCodeInputSchema = z.object({
  clientId: z.string(),
  scopes: z.array(z.string()),
  teamSlug: z.string().optional(),
  codeChallenge: z.string().optional(),
  codeChallengeMethod: z.enum(["S256"]).optional(),
});

export type TGenerateAuthCodeInputSchema = z.infer<typeof ZGenerateAuthCodeInputSchema>;
