import z from "zod";

export const ZEventInputSchema = z.object({
  username: z.string(),
  eventSlug: z.string(),
  isTeamEvent: z.boolean().optional(),
  org: z.string().nullable(),
  /**
   * Informs that the event request has been sent from a page that was reached by a redirect from non-org link(i.e. app.cal.com/username redirected to acme.cal.com/username)
   * Based on this decision like whether to allow unpublished organization's event to be served or not can be made.
   */
  fromRedirectOfNonOrgLink: z.boolean().optional().default(false),
});

export type TEventInputSchema = z.infer<typeof ZEventInputSchema>;
