import { z } from "zod";

import { timeZoneSchema } from "@calcom/lib/dayjs/timeZone.schema";
import { teamMetadataStrictSchema } from "@calcom/prisma/zod-utils";

export const ZUpdateInputSchema = z.object({
  name: z.string().optional(),
  orgId: z
    .string()
    .regex(/^\d+$/)
    .transform((id) => parseInt(id))
    .or(z.number())
    .optional(),
  bio: z.string().optional(),
  logoUrl: z.string().optional().nullable(),
  calVideoLogo: z
    .string()
    .optional()
    .nullable()
    .transform((v) => v || null),
  banner: z.string().nullable().optional(),
  slug: z.string().optional(),
  hideBranding: z.boolean().optional(),
  hideBookATeamMember: z.boolean().optional(),
  brandColor: z.string().optional(),
  darkBrandColor: z.string().optional(),
  theme: z.string().optional().nullable(),
  timeZone: timeZoneSchema.optional(),
  weekStart: z.string().optional(),
  timeFormat: z.number().optional(),
  metadata: teamMetadataStrictSchema.unwrap().optional(),
  lockEventTypeCreation: z.boolean().optional(),
  lockEventTypeCreationOptions: z.enum(["DELETE", "HIDE"]).optional(),
  adminGetsNoSlotsNotification: z.boolean().optional(),
  allowSEOIndexing: z.boolean().optional(),
  orgProfileRedirectsToVerifiedDomain: z.boolean().optional(),
  disablePhoneOnlySMSNotifications: z.boolean().optional(),
  disableAutofillOnBookingPage: z.boolean().optional(),
  orgAutoJoinOnSignup: z.boolean().optional(),
  disableAttendeeConfirmationEmail: z.boolean().optional(),
  disableAttendeeCancellationEmail: z.boolean().optional(),
  disableAttendeeRescheduledEmail: z.boolean().optional(),
  disableAttendeeRequestEmail: z.boolean().optional(),
  disableAttendeeReassignedEmail: z.boolean().optional(),
  disableAttendeeAwaitingPaymentEmail: z.boolean().optional(),
  disableAttendeeRescheduleRequestEmail: z.boolean().optional(),
  disableAttendeeLocationChangeEmail: z.boolean().optional(),
  disableAttendeeNewEventEmail: z.boolean().optional(),
});

export type TUpdateInputSchema = z.infer<typeof ZUpdateInputSchema>;
