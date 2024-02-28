import { z } from "zod";

const GetPublicEventSchema = z.object({
  username: z.string().transform((s) => s.toLowerCase()),
  eventSlug: z.string(),
  isTeamEvent: z.boolean().optional(),
  org: z.string().optional(),
});

export type GetPublicEventArgs = z.infer<typeof GetPublicEventSchema>;
