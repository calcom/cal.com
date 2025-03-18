import { z } from "zod";

export const ZGetHashedLinksInputSchema = z.object({
  linkIds: z.array(z.string()),
});

export type TGetHashedLinksInputSchema = z.infer<typeof ZGetHashedLinksInputSchema>;
