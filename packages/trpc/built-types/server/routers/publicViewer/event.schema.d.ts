import z from "zod";
export declare const ZEventInputSchema: z.ZodObject<{
    username: z.ZodString;
    eventSlug: z.ZodString;
    isTeamEvent: z.ZodOptional<z.ZodBoolean>;
    org: z.ZodNullable<z.ZodString>;
    /**
     * Informs that the event request has been sent from a page that was reached by a redirect from non-org link(i.e. app.cal.com/username redirected to acme.cal.com/username)
     * Based on this decision like whether to allow unpublished organization's event to be served or not can be made.
     */
    fromRedirectOfNonOrgLink: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
}, "strip", z.ZodTypeAny, {
    username: string;
    org: string | null;
    eventSlug: string;
    fromRedirectOfNonOrgLink: boolean;
    isTeamEvent?: boolean | undefined;
}, {
    username: string;
    org: string | null;
    eventSlug: string;
    isTeamEvent?: boolean | undefined;
    fromRedirectOfNonOrgLink?: boolean | undefined;
}>;
export type TEventInputSchema = z.infer<typeof ZEventInputSchema>;
