import { EventTypeCustomInputType } from "@prisma/client";
import { UnitTypeLongPlural } from "dayjs";
import z, { ZodNullable, ZodObject, ZodOptional } from "zod";

/* eslint-disable no-underscore-dangle */
import type {
  objectInputType,
  objectOutputType,
  ZodNullableDef,
  ZodOptionalDef,
  ZodRawShape,
  ZodTypeAny,
} from "zod";

import { appDataSchemas } from "@calcom/app-store/apps.schemas.generated";
import dayjs from "@calcom/dayjs";
import { slugify } from "@calcom/lib/slugify";

// Let's not import 118kb just to get an enum
export enum Frequency {
  YEARLY = 0,
  MONTHLY = 1,
  WEEKLY = 2,
  DAILY = 3,
  HOURLY = 4,
  MINUTELY = 5,
  SECONDLY = 6,
}

export const RequiresConfirmationThresholdUnits: z.ZodType<UnitTypeLongPlural> = z.enum(["hours", "minutes"]);

export const EventTypeMetaDataSchema = z
  .object({
    smartContractAddress: z.string().optional(),
    blockchainId: z.number().optional(),
    multipleDuration: z.number().array().optional(),
    giphyThankYouPage: z.string().optional(),
    apps: z.object(appDataSchemas).partial().optional(),
    additionalNotesRequired: z.boolean().optional(),
    disableSuccessPage: z.boolean().optional(),
    requiresConfirmationThreshold: z
      .object({
        time: z.number(),
        unit: RequiresConfirmationThresholdUnits,
      })
      .optional(),
    config: z
      .object({
        useHostSchedulesForTeamEvent: z.boolean().optional(),
      })
      .optional(),
  })
  .nullable();

export const eventTypeLocations = z.array(
  z.object({
    // TODO: Couldn't find a way to make it a union of types from App Store locations
    // Creating a dynamic union by iterating over the object doesn't seem to make TS happy
    type: z.string(),
    address: z.string().optional(),
    link: z.string().url().optional(),
    displayLocationPublicly: z.boolean().optional(),
    hostPhoneNumber: z.string().optional(),
  })
);

// Matching RRule.Options: rrule/dist/esm/src/types.d.ts
export const recurringEventType = z
  .object({
    dtstart: z.date().optional(),
    interval: z.number(),
    count: z.number(),
    freq: z.nativeEnum(Frequency),
    until: z.date().optional(),
    tzid: z.string().optional(),
  })
  .nullable();

// dayjs iso parsing is very buggy - cant use :( - turns ISO string into Date object
export const iso8601 = z.string().transform((val, ctx) => {
  const time = Date.parse(val);
  if (!time) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Invalid ISO Date",
    });
  }
  const d = new Date();
  d.setTime(time);
  return d;
});

export const bookingLimitsType = z
  .object({
    PER_DAY: z.number().optional(),
    PER_WEEK: z.number().optional(),
    PER_MONTH: z.number().optional(),
    PER_YEAR: z.number().optional(),
  })
  .nullable();

export const eventTypeSlug = z.string().transform((val) => slugify(val.trim()));

export const stringToDate = z.string().transform((a) => new Date(a));

export const stringOrNumber = z.union([
  z.string().transform((v, ctx) => {
    const parsed = parseInt(v);
    if (isNaN(parsed)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Not a number",
      });
    }
    return parsed;
  }),
  z.number().int(),
]);

export const stringToDayjs = z.string().transform((val) => dayjs(val));

export const bookingCreateBodySchema = z.object({
  email: z.string(),
  end: z.string(),
  eventTypeId: z.number(),
  eventTypeSlug: z.string().optional(),
  guests: z.array(z.string()).optional(),
  location: z.string(),
  name: z.string(),
  notes: z.string().optional(),
  rescheduleUid: z.string().optional(),
  recurringEventId: z.string().optional(),
  start: z.string(),
  timeZone: z.string(),
  user: z.union([z.string(), z.array(z.string())]).optional(),
  language: z.string(),
  bookingUid: z.string().optional(),
  customInputs: z.array(z.object({ label: z.string(), value: z.union([z.string(), z.boolean()]) })),
  metadata: z.record(z.string()),
  hasHashedBookingLink: z.boolean().optional(),
  hashedLink: z.string().nullish(),
  ethSignature: z.string().optional(),
});

export const requiredCustomInputSchema = z.union([
  // string must be given & nonempty
  z.string().trim().min(1),
  // boolean must be true if set.
  z.boolean().refine((v) => v === true),
]);

export type BookingCreateBody = z.input<typeof bookingCreateBodySchema>;

export const bookingConfirmPatchBodySchema = z.object({
  bookingId: z.number(),
  confirmed: z.boolean(),
  recurringEventId: z.string().optional(),
  reason: z.string().optional(),
});

export const extendedBookingCreateBody = bookingCreateBodySchema.merge(
  z.object({
    noEmail: z.boolean().optional(),
    recurringCount: z.number().optional(),
    allRecurringDates: z.string().array().optional(),
    currentRecurringIndex: z.number().optional(),
    rescheduleReason: z.string().optional(),
    smsReminderNumber: z.string().optional().nullable(),
    appsStatus: z
      .array(
        z.object({
          appName: z.string(),
          success: z.number(),
          failures: z.number(),
          type: z.string(),
          errors: z.string().array(),
          warnings: z.string().array().optional(),
        })
      )
      .optional(),
  })
);

export const schemaBookingCancelParams = z.object({
  id: z.number().optional(),
  uid: z.string().optional(),
  allRemainingBookings: z.boolean().optional(),
  cancellationReason: z.string().optional(),
});

export const vitalSettingsUpdateSchema = z.object({
  connected: z.boolean().optional(),
  selectedParam: z.string().optional(),
  sleepValue: z.number().optional(),
});

export const createdEventSchema = z
  .object({
    id: z.string(),
    password: z.union([z.string(), z.undefined()]),
    onlineMeetingUrl: z.string().nullable(),
  })
  .passthrough();

export const userMetadata = z
  .object({
    proPaidForByTeamId: z.number().optional(),
    stripeCustomerId: z.string().optional(),
    vitalSettings: vitalSettingsUpdateSchema.optional(),
    isPremium: z.boolean().optional(),
  })
  .nullable();

export const teamMetadataSchema = z
  .object({
    requestedSlug: z.string(),
    paymentId: z.string(),
    subscriptionId: z.string().nullable(),
    subscriptionItemId: z.string().nullable(),
  })
  .partial()
  .nullable();

export const bookingMetadataSchema = z
  .object({
    videoCallUrl: z.string().optional(),
  })
  .nullable();

export const customInputOptionSchema = z.array(
  z.object({
    label: z.string(),
    type: z.string(),
  })
);

export const customInputSchema = z.object({
  id: z.number(),
  eventTypeId: z.number(),
  label: z.string(),
  type: z.nativeEnum(EventTypeCustomInputType),
  options: customInputOptionSchema.optional().nullable(),
  required: z.boolean(),
  placeholder: z.string(),
  hasToBeCreated: z.boolean().optional(),
});

export type CustomInputSchema = z.infer<typeof customInputSchema>;

export const recordingItemSchema = z.object({
  id: z.string(),
  room_name: z.string(),
  start_ts: z.number(),
  status: z.string(),
  max_participants: z.number(),
  duration: z.number(),
  share_token: z.string(),
});

export const recordingItemsSchema = z.array(recordingItemSchema);

export type RecordingItemSchema = z.infer<typeof recordingItemSchema>;

export const getRecordingsResponseSchema = z.union([
  z.object({
    total_count: z.number(),
    data: recordingItemsSchema,
  }),
  z.object({}),
]);

export type GetRecordingsResponseSchema = z.infer<typeof getRecordingsResponseSchema>;

/**
 * Ensures that it is a valid HTTP URL
 * It automatically avoids
 * -  XSS attempts through javascript:alert('hi')
 * - mailto: links
 */
export const successRedirectUrl = z
  .union([
    z.literal(""),
    z
      .string()
      .url()
      .regex(/^http(s)?:\/\/.*/),
  ])
  .optional();

export const RoutingFormSettings = z
  .object({
    emailOwnerOnSubmission: z.boolean(),
  })
  .nullable();

export const DeploymentTheme = z
  .object({
    brand: z.string().default("#292929"),
    textBrand: z.string().default("#ffffff"),
    darkBrand: z.string().default("#fafafa"),
    textDarkBrand: z.string().default("#292929"),
    bookingHighlight: z.string().default("#10B981"),
    bookingLightest: z.string().default("#E1E1E1"),
    bookingLighter: z.string().default("#ACACAC"),
    bookingLight: z.string().default("#888888"),
    bookingMedian: z.string().default("#494949"),
    bookingDark: z.string().default("#313131"),
    bookingDarker: z.string().default("#292929"),
    fontName: z.string().default("Cal Sans"),
    fontSrc: z.string().default("https://cal.com/cal.ttf"),
  })
  .optional();

export type ZodDenullish<T extends ZodTypeAny> = T extends ZodNullable<infer U> | ZodOptional<infer U>
  ? ZodDenullish<U>
  : T;

export type ZodDenullishShape<T extends ZodRawShape> = {
  [k in keyof T]: ZodDenullish<T[k]>;
};

export const denullish = <T extends ZodTypeAny>(schema: T): ZodDenullish<T> =>
  (schema instanceof ZodNullable || schema instanceof ZodOptional
    ? denullish((schema._def as ZodNullableDef | ZodOptionalDef).innerType)
    : schema) as ZodDenullish<T>;

type UnknownKeysParam = "passthrough" | "strict" | "strip";

/**
 * @see https://github.com/3x071c/lsg-remix/blob/e2a9592ba3ec5103556f2cf307c32f08aeaee32d/app/lib/util/zod.ts
 */
export function denullishShape<
  T extends ZodRawShape,
  UnknownKeys extends UnknownKeysParam = "strip",
  Catchall extends ZodTypeAny = ZodTypeAny,
  Output = objectOutputType<T, Catchall>,
  Input = objectInputType<T, Catchall>
>(
  obj: ZodObject<T, UnknownKeys, Catchall, Output, Input>
): ZodObject<ZodDenullishShape<T>, UnknownKeys, Catchall> {
  const a = entries(obj.shape).map(([field, schema]) => [field, denullish(schema)] as const) as {
    [K in keyof T]: [K, ZodDenullish<T[K]>];
  }[keyof T][];
  return new ZodObject({
    ...obj._def,
    shape: () => fromEntries(a) as unknown as ZodDenullishShape<T>, // TODO: Safely assert type
  });
}

/**
 * Like Object.entries, but with actually useful typings
 * @param obj The object to turn into a tuple array (`[key, value][]`)
 * @returns The constructed tuple array from the given object
 * @see https://github.com/3x071c/lsg-remix/blob/e2a9592ba3ec5103556f2cf307c32f08aeaee32d/app/lib/util/entries.ts
 */
export const entries = <O>(
  obj: O
): {
  readonly [K in keyof O]: [K, O[K]];
}[keyof O][] => {
  return Object.entries(obj) as {
    [K in keyof O]: [K, O[K]];
  }[keyof O][];
};

/**
 * Returns a type with all readonly notations removed (traverses recursively on an object)
 */
type DeepWriteable<T> = T extends Readonly<{
  -readonly [K in keyof T]: T[K];
}>
  ? {
      -readonly [K in keyof T]: DeepWriteable<T[K]>;
    }
  : T; /* Make it work with readonly types (this is not strictly necessary) */

type FromEntries<T> = T extends [infer Keys, unknown][]
  ? { [K in Keys & PropertyKey]: Extract<T[number], [K, unknown]>[1] }
  : never;

/**
 * Like Object.fromEntries, but with actually useful typings
 * @param arr The tuple array (`[key, value][]`) to turn into an object
 * @returns Object constructed from the given entries
 * @see https://github.com/3x071c/lsg-remix/blob/e2a9592ba3ec5103556f2cf307c32f08aeaee32d/app/lib/util/fromEntries.ts
 */
export const fromEntries = <
  E extends [PropertyKey, unknown][] | ReadonlyArray<readonly [PropertyKey, unknown]>
>(
  entries: E
): FromEntries<DeepWriteable<E>> => {
  return Object.fromEntries(entries) as FromEntries<DeepWriteable<E>>;
};
