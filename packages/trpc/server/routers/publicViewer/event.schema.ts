import z from "zod";

export const ZEventInputSchema = z.object({
  username: z.string(),
  eventSlug: z.string(),
  isTeamEvent: z.boolean().optional(),
  org: z.string().nullable(),
});

export type TEventInputSchema = z.infer<typeof ZEventInputSchema>;
