import { z } from "zod";

export const ZBillingPortalLinkSchema = z.object({});

export type TBillingPortalLinkSchema = z.infer<typeof ZBillingPortalLinkSchema>;
