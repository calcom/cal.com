import z from "zod";

export const ZEventInputSchema = z.object({
  username: z.string(),
  eventSlug: z.string(),
  isTeamEvent: z.boolean().optional(),
  org: z.string().nullable(),
  isARedirectFromNonOrgLink: z.boolean().optional().default(false),
});

export type TEventInputSchema = z.infer<typeof ZEventInputSchema>;
