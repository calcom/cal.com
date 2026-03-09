import { z } from "zod";

export const ZGetClientForAuthorizationInputSchema = z.object({
  clientId: z.string(),
  redirectUri: z.string().url("Must be a valid URL"),
  scope: z.string().optional(),
});

export type TGetClientForAuthorizationInputSchema = z.infer<typeof ZGetClientForAuthorizationInputSchema>;
