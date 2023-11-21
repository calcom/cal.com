import { z } from "zod";

export const ZGetByEventSlugInputSchema = z.object({
  eventSlug: z.string(),
});

export type TGetByEventSlugInputSchema = z.infer<typeof ZGetByEventSlugInputSchema>;
