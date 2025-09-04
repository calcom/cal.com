import { z } from "zod";

export const ZGoogleWorkspaceInputSchema = z.object({
  domain: z.string(),
});

export type TGoogleWorkspaceInputSchema = z.infer<typeof ZGoogleWorkspaceInputSchema>;
