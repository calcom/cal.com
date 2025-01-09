import { z } from "zod";

export const ZCheckAvailableSlug = z.object({
  slug: z.string(),
});

export type TCheckAvailableSlug = z.infer<typeof ZCheckAvailableSlug>;
