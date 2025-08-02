import { z } from "zod";

export const ZAddUsernameAliasInputSchema = z.object({
  username: z.string(),
});

export type TAddUsernameAliasInputSchema = z.infer<typeof ZAddUsernameAliasInputSchema>;
