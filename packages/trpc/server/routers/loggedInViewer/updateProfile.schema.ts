import { z } from "zod";

import { FULL_NAME_LENGTH_MAX_LIMIT } from "@calcom/lib/constants";
import { bookerLayouts, userMetadata } from "@calcom/prisma/zod-utils";

export const updateUserMetadataAllowedKeys = z.object({
  sessionTimeout: z.number().optional(), // Minutes
  defaultBookerLayouts: bookerLayouts.optional(),
});

export const ZUpdateProfileInputSchema = z.object({
  username: z.string().optional(),
  name: z.string().max(FULL_NAME_LENGTH_MAX_LIMIT).optional(),
  email: z.string().optional(),
  bio: z.string().optional(),
  avatarUrl: z.string().nullable().optional(),
  timeZone: z.string().optional(),
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
        timeZone: z.string(),
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
  unlinkConnectedAccount: z.boolean().optional(),
});

export type TUpdateProfileInputSchema = z.infer<typeof ZUpdateProfileInputSchema>;
