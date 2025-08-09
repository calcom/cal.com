import { z } from "zod";

export const ZAddSecondaryUsernameInputSchema = z.object({
  usename: z.string(),
});

export type TAddSecondaryEmailInputSchema = z.infer<typeof ZAddSecondaryUsernameInputSchema>;
