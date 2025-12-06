import { z } from "zod";

export const ZSubmitClientInputSchema = z.object({
  name: z.string().min(1, "Client name is required"),
  redirectUri: z.string().url("Must be a valid URL"),
  logo: z.string().optional(),
  enablePkce: z.boolean().optional().default(false),
});

export type TSubmitClientInputSchema = z.infer<typeof ZSubmitClientInputSchema>;
