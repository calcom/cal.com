import { z } from "zod";

import { FULL_NAME_LENGTH_MAX_LIMIT } from "@calcom/lib/constants";
import { timeZoneSchema } from "@calcom/lib/dayjs/timeZone.schema";
import { bookerLayouts, userMetadata } from "@calcom/prisma/zod-utils";

export const updateUserMetadataAllowedKeys = z.object({
  sessionTimeout: z.number().optional(), // Minutes
  headerUrl: z.string().optional().nullable(),
  defaultBookerLayouts: bookerLayouts.optional(),
  phoneNumber: z.string().optional().nullable(),
  isProUser: z
    .object({
      yearClaimed: z.number().optional(),
      formSubmittedForYear: z.number().optional(),
      validTillDate: z.string().optional(),
      verified: z.boolean().optional(),
    })
    .optional(),
  gettingStartedActions: z
    .object({
      viewPublicPage: z.boolean().optional(),
      updateUsername: z.boolean().optional(),
      addOrEditEvents: z.boolean().optional(),
      setAvailability: z.boolean().optional(),
      shareYourCalID: z.boolean().optional(),
    })
    .optional(),
  usePhoneForWhatsApp: z.boolean().optional(),
});

export const ZCalIdUpdateProfileInputSchema = z.object({
  username: z.string().optional(),
  name: z.string().max(FULL_NAME_LENGTH_MAX_LIMIT).optional(),
  email: z.string().optional(),
  bio: z.string().optional(),
  avatarUrl: z.string().nullable().optional(),
  timeZone: timeZoneSchema.optional(),
  weekStart: z.string().optional(),
  hideBranding: z.boolean().optional(),
  allowDynamicBooking: z.boolean().optional(),
  allowSEOIndexing: z.boolean().optional(),
  receiveMonthlyDigestEmail: z.boolean().optional(),
  brandColor: z.string().optional(),
  darkBrandColor: z.string().optional(),
  theme: z.string().optional().nullable(),
  appTheme: z.string().optional().nullable(),
  completedOnboarding: z.boolean().optional(),
  locale: z.string().optional(),
  timeFormat: z.number().optional(),
  disableImpersonation: z.boolean().optional(),
  metadata: userMetadata.optional(),
  travelSchedules: z
    .array(
      z.object({
        id: z.number().optional(),
        timeZone: timeZoneSchema,
        endDate: z.date().optional(),
        startDate: z.date(),
      })
    )
    .optional(),
  secondaryEmails: z
    .array(
      z.object({
        id: z.number(),
        email: z.string(),
        isDeleted: z.boolean().default(false),
      })
    )
    .optional(),
});

export type TCalIdUpdateProfileInputSchema = z.infer<typeof ZCalIdUpdateProfileInputSchema>;
