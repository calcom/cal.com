import { z } from "zod";

export const integrationOAuthCallbackStateSchema = z.object({
  returnTo: z.string(),
  installGoogleVideo: z.boolean().optional(),
});
