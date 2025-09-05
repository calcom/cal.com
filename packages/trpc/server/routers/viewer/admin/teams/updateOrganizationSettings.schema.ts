import { z } from "zod";

export const ZUpdateOrganizationSettingsSchema = z.object({
  teamId: z.number(),
  data: z.object({
    isOrganizationConfigured: z.boolean().optional(),
    isOrganizationVerified: z.boolean().optional(),
    orgAutoAcceptEmail: z.string().email().optional(),
    lockEventTypeCreationForUsers: z.boolean().optional(),
    adminGetsNoSlotsNotification: z.boolean().optional(),
    isAdminReviewed: z.boolean().optional(),
    isAdminAPIEnabled: z.boolean().optional(),
    allowSEOIndexing: z.boolean().optional(),
    orgProfileRedirectsToVerifiedDomain: z.boolean().optional(),
    disablePhoneOnlySMSNotifications: z.boolean().optional(),
  }),
});

export type TUpdateOrganizationSettingsSchema = z.infer<typeof ZUpdateOrganizationSettingsSchema>;
