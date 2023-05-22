import z from "zod";

export const ZEventInputSchema = z.object({
  username: z.string(),
  eventSlug: z.string(),
});

export type TEventInputSchema = z.infer<typeof ZEventInputSchema>;
