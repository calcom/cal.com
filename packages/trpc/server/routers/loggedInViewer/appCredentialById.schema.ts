import { z } from "zod";

export const ZAppCredentialByIdInputSchema = z.object({
  id: z.number(),
});

export type TAppCredentialByIdInputSchema = z.infer<typeof ZAppCredentialByIdInputSchema>;
