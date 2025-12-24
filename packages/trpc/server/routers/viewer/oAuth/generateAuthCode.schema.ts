import { z } from "zod";

export type TGenerateAuthCodeInputSchema = {
  clientId: string;
  scopes: string[];
  teamSlug?: string;
  codeChallenge?: string;
  codeChallengeMethod?: "S256";
};

export const ZGenerateAuthCodeInputSchema: z.ZodType<TGenerateAuthCodeInputSchema> = z.object({
  clientId: z.string(),
  scopes: z.array(z.string()),
  teamSlug: z.string().optional(),
  codeChallenge: z.string().optional(),
  codeChallengeMethod: z.enum(["S256"]).optional(),
});
