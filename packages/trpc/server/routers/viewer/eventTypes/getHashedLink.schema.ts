import { z } from "zod";

export const ZGetHashedLinkInputSchema = z.object({
  linkId: z.string(),
});

export type TGetHashedLinkInputSchema = z.infer<typeof ZGetHashedLinkInputSchema>;
