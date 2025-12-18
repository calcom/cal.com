import { z } from "zod";

import { timeZoneSchema } from "@calcom/lib/dayjs/timeZone.schema";
import { teamMetadataStrictSchema } from "@calcom/prisma/zod-utils";

// Note: orgId has .transform() that converts string to number, so input accepts string | number but output is always number

export type TUpdateInputSchemaInput = {
  name?: string;
  orgId?: string | number;
  bio?: string;
  logoUrl?: string | null;
  calVideoLogo?: string | null;
  banner?: string | null;
  slug?: string;
  hideBranding?: boolean;
  hideBookATeamMember?: boolean;
  brandColor?: string;
  darkBrandColor?: string;
  theme?: string | null;
  timeZone?: string;
  weekStart?: string;
  timeFormat?: number;
  metadata?: z.infer<ReturnType<typeof teamMetadataStrictSchema.unwrap>>;
  lockEventTypeCreation?: boolean;
  lockEventTypeCreationOptions?: "DELETE" | "HIDE";
  adminGetsNoSlotsNotification?: boolean;
  allowSEOIndexing?: boolean;
  orgProfileRedirectsToVerifiedDomain?: boolean;
  disablePhoneOnlySMSNotifications?: boolean;
  disableAutofillOnBookingPage?: boolean;
  orgAutoJoinOnSignup?: boolean;
  disableAttendeeConfirmationEmail?: boolean;
  disableAttendeeCancellationEmail?: boolean;
  disableAttendeeRescheduledEmail?: boolean;
  disableAttendeeRequestEmail?: boolean;
  disableAttendeeReassignedEmail?: boolean;
  disableAttendeeAwaitingPaymentEmail?: boolean;
  disableAttendeeRescheduleRequestEmail?: boolean;
  disableAttendeeLocationChangeEmail?: boolean;
  disableAttendeeNewEventEmail?: boolean;
};

export type TUpdateInputSchema = {
  name?: string;
  orgId?: number;
  bio?: string;
  logoUrl?: string | null;
  calVideoLogo?: string | null;
  banner?: string | null;
  slug?: string;
  hideBranding?: boolean;
  hideBookATeamMember?: boolean;
  brandColor?: string;
  darkBrandColor?: string;
  theme?: string | null;
  timeZone?: string;
  weekStart?: string;
  timeFormat?: number;
  metadata?: z.infer<ReturnType<typeof teamMetadataStrictSchema.unwrap>>;
  lockEventTypeCreation?: boolean;
  lockEventTypeCreationOptions?: "DELETE" | "HIDE";
  adminGetsNoSlotsNotification?: boolean;
  allowSEOIndexing?: boolean;
  orgProfileRedirectsToVerifiedDomain?: boolean;
  disablePhoneOnlySMSNotifications?: boolean;
  disableAutofillOnBookingPage?: boolean;
  orgAutoJoinOnSignup?: boolean;
  disableAttendeeConfirmationEmail?: boolean;
  disableAttendeeCancellationEmail?: boolean;
  disableAttendeeRescheduledEmail?: boolean;
  disableAttendeeRequestEmail?: boolean;
  disableAttendeeReassignedEmail?: boolean;
  disableAttendeeAwaitingPaymentEmail?: boolean;
  disableAttendeeRescheduleRequestEmail?: boolean;
  disableAttendeeLocationChangeEmail?: boolean;
  disableAttendeeNewEventEmail?: boolean;
};

export const ZUpdateInputSchema: z.ZodType<TUpdateInputSchema, z.ZodTypeDef, TUpdateInputSchemaInput> = z.object({
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
