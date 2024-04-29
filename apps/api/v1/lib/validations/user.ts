import { z } from "zod";

import { checkUsername } from "@calcom/lib/server/checkUsername";
import { _UserModel as User } from "@calcom/prisma/zod";
import { iso8601 } from "@calcom/prisma/zod-utils";

import { isValidBase64Image } from "~/lib/utils/isValidBase64Image";
import { timeZone } from "~/lib/validations/shared/timeZone";

// @note: These are the ONLY values allowed as weekStart. So user don't introduce bad data.
enum weekdays {
  MONDAY = "Monday",
  TUESDAY = "Tuesday",
  WEDNESDAY = "Wednesday",
  THURSDAY = "Thursday",
  FRIDAY = "Friday",
  SATURDAY = "Saturday",
  SUNDAY = "Sunday",
}

// @note: extracted from apps/web/next-i18next.config.js, update if new locales.
enum locales {
  EN = "en",
  FR = "fr",
  IT = "it",
  RU = "ru",
  ES = "es",
  DE = "de",
  PT = "pt",
  RO = "ro",
  NL = "nl",
  PT_BR = "pt-BR",
  // ES_419 = "es-419", // Disabled until Crowdin reaches at least 80% completion
  KO = "ko",
  JA = "ja",
  PL = "pl",
  AR = "ar",
  IW = "iw",
  ZH_CN = "zh-CN",
  ZH_TW = "zh-TW",
  CS = "cs",
  SR = "sr",
  SV = "sv",
  VI = "vi",
}
enum theme {
  DARK = "dark",
  LIGHT = "light",
}

enum timeFormat {
  TWELVE = 12,
  TWENTY_FOUR = 24,
}

const usernameSchema = z
  .string()
  .transform((v) => v.toLowerCase())
  // .refine(() => {})
  .superRefine(async (val, ctx) => {
    if (val) {
      const result = await checkUsername(val);
      if (!result.available) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "already_in_use_error" });
      if (result.premium) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "premium_username" });
    }
  });

// @note: These are the values that are editable via PATCH method on the user Model
export const schemaUserBaseBodyParams = User.pick({
  name: true,
  email: true,
  username: true,
  bio: true,
  timeZone: true,
  weekStart: true,
  theme: true,
  appTheme: true,
  defaultScheduleId: true,
  locale: true,
  hideBranding: true,
  timeFormat: true,
  brandColor: true,
  darkBrandColor: true,
  allowDynamicBooking: true,
  role: true,
  // @note: disallowing avatar changes via API for now. We can add it later if needed. User should upload image via UI.
  // avatar: true,
}).partial();
// @note: partial() is used to allow for the user to edit only the fields they want to edit making all optional,
// if want to make any required do it in the schemaRequiredParams

// Here we can both require or not (adding optional or nullish) and also rewrite validations for any value
// for example making weekStart only accept weekdays as input
const schemaUserEditParams = z.object({
  email: z.string().email().toLowerCase(),
  username: usernameSchema,
  weekStart: z.nativeEnum(weekdays).optional(),
  brandColor: z.string().min(4).max(9).regex(/^#/).optional(),
  darkBrandColor: z.string().min(4).max(9).regex(/^#/).optional(),
  hideBranding: z.boolean().optional(),
  timeZone: timeZone.optional(),
  theme: z.nativeEnum(theme).optional().nullable(),
  appTheme: z.nativeEnum(theme).optional().nullable(),
  timeFormat: z.nativeEnum(timeFormat).optional(),
  defaultScheduleId: z
    .number()
    .refine((id: number) => id > 0)
    .optional()
    .nullable(),
  locale: z.nativeEnum(locales).optional().nullable(),
  avatar: z.string().refine(isValidBase64Image).optional(),
});

// @note: These are the values that are editable via PATCH method on the user Model,
// merging both BaseBodyParams with RequiredParams, and omiting whatever we want at the end.

const schemaUserCreateParams = z.object({
  email: z.string().email().toLowerCase(),
  username: usernameSchema,
  weekStart: z.nativeEnum(weekdays).optional(),
  brandColor: z.string().min(4).max(9).regex(/^#/).optional(),
  darkBrandColor: z.string().min(4).max(9).regex(/^#/).optional(),
  hideBranding: z.boolean().optional(),
  timeZone: timeZone.optional(),
  theme: z.nativeEnum(theme).optional().nullable(),
  appTheme: z.nativeEnum(theme).optional().nullable(),
  timeFormat: z.nativeEnum(timeFormat).optional(),
  defaultScheduleId: z
    .number()
    .refine((id: number) => id > 0)
    .optional()
    .nullable(),
  locale: z.nativeEnum(locales).optional(),
  createdDate: iso8601.optional(),
  avatar: z.string().refine(isValidBase64Image).optional(),
});

// @note: These are the values that are editable via PATCH method on the user Model,
// merging both BaseBodyParams with RequiredParams, and omiting whatever we want at the end.
export const schemaUserEditBodyParams = schemaUserBaseBodyParams
  .merge(schemaUserEditParams)
  .omit({})
  .partial()
  .strict();

export const schemaUserCreateBodyParams = schemaUserBaseBodyParams
  .merge(schemaUserCreateParams)
  .omit({})
  .strict();

// @note: These are the values that are always returned when reading a user
export const schemaUserReadPublic = User.pick({
  id: true,
  username: true,
  name: true,
  email: true,
  emailVerified: true,
  bio: true,
  avatar: true,
  timeZone: true,
  weekStart: true,
  endTime: true,
  bufferTime: true,
  appTheme: true,
  theme: true,
  defaultScheduleId: true,
  locale: true,
  timeFormat: true,
  hideBranding: true,
  brandColor: true,
  darkBrandColor: true,
  allowDynamicBooking: true,
  createdDate: true,
  verified: true,
  invitedTo: true,
  role: true,
});

export const schemaUsersReadPublic = z.array(schemaUserReadPublic);
