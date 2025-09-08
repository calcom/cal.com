import { z } from "zod";

export const ZUpdateUserDefaultConferencingAppInputSchema = z.object({
  appSlug: z.string().optional(),
  appLink: z.string().optional(),
});

export type TUpdateUserDefaultConferencingAppInputSchema = z.infer<
  typeof ZUpdateUserDefaultConferencingAppInputSchema
>;
