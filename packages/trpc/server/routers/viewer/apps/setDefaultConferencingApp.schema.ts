import { z } from "zod";

export const ZSetDefaultConferencingAppSchema = z.object({
  slug: z.string(),
});

export type TSetDefaultConferencingAppSchema = z.infer<typeof ZSetDefaultConferencingAppSchema>;
