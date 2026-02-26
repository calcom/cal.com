import { z } from "zod";

export const ZIsFreeDomainInputSchema = z.object({
  email: z.string().email(),
});

export type TIsFreeDomainInputSchema = z.infer<typeof ZIsFreeDomainInputSchema>;
