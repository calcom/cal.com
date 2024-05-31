import type { Prisma } from "@prisma/client";
import type { UnitTypeLongPlural } from "dayjs";
import { isValidPhoneNumber } from "libphonenumber-js";
import type { TFunction } from "next-i18next";
import z, { ZodNullable, ZodObject, ZodOptional } from "zod";
import type {
  AnyZodObject,
  objectInputType,
  objectOutputType,
  ZodNullableDef,
  ZodOptionalDef,
  ZodRawShape,
  ZodTypeAny,
} from "zod";

import { appDataSchemas } from "@calcom/app-store/apps.schemas.generated";
import dayjs from "@calcom/dayjs";
import { isPasswordValid } from "@calcom/features/auth/lib/isPasswordValid";
import type { FieldType as FormBuilderFieldType } from "@calcom/features/form-builder/schema";
import { fieldsSchema as formBuilderFieldsSchema } from "@calcom/features/form-builder/schema";
import { isSupportedTimeZone } from "@calcom/lib/date-fns";
import { slugify } from "@calcom/lib/slugify";
import { EventTypeCustomInputType } from "@calcom/prisma/enums";

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

export enum BookerLayouts {
  MONTH_VIEW = "month_view",
  WEEK_VIEW = "week_view",
  COLUMN_VIEW = "column_view",
}

export const bookerLayoutOptions = [
  BookerLayouts.MONTH_VIEW,
  BookerLayouts.WEEK_VIEW,
  BookerLayouts.COLUMN_VIEW,
];

const layoutOptions = z.union([
  z.literal(bookerLayoutOptions[0]),
  z.literal(bookerLayoutOptions[1]),
  z.literal(bookerLayoutOptions[2]),
]);

export const bookerLayouts = z
  .object({
    enabledLayouts: z.array(layoutOptions),
    defaultLayout: layoutOptions,
  })
  .nullable();

export const defaultBookerLayoutSettings = {
  defaultLayout: BookerLayouts.MONTH_VIEW,
  // if the user has no explicit layouts set (not in user profile and not in event settings), all layouts are enabled.
  enabledLayouts: bookerLayoutOptions,
};

export type BookerLayoutSettings = z.infer<typeof bookerLayouts>;

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
    disableStandardEmails: z
      .object({
        confirmation: z
          .object({
            host: z.boolean().optional(),
            attendee: z.boolean().optional(),
          })
          .optional(),
      })
      .optional(),
    managedEventConfig: z
      .object({
        unlockedFields: z.custom<{ [k in keyof Omit<Prisma.EventTypeSelect, "id">]: true }>().optional(),
      })
      .optional(),
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
    bookerLayouts: bookerLayouts.optional(),
  })
  .nullable();

export const eventTypeBookingFields = formBuilderFieldsSchema;
export const BookingFieldTypeEnum = eventTypeBookingFields.element.shape.type.Enum;
export type BookingFieldType = FormBuilderFieldType;

// Validation of user added bookingFields' responses happen using `getBookingResponsesSchema` which requires `eventType`.
// So it is a dynamic validation and thus entire validation can't exist here
// Note that this validation runs to validate prefill params as well, so it should consider that partial values can be there. e.g. `name` might be empty string
export const bookingResponses = z
  .object({
    email: z.string(),
    //TODO: Why don't we move name out of bookingResponses and let it be handled like user fields?
    name: z.union([
      z.string(),
      z.object({
        firstName: z.string(),
        lastName: z.string().optional(),
      }),
    ]),
    guests: z.array(z.string()).optional(),
    notes: z.string().optional(),
    location: z
      .object({
        optionValue: z.string(),
        value: z.string(),
      })
      .optional(),
    smsReminderNumber: z.string().optional(),
    rescheduleReason: z.string().optional(),
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
    credentialId: z.number().optional(),
    teamName: z.string().optional(),
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

export const intervalLimitsType = z
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

export const stringToDayjs = (val: string) => {
  const matches = val.match(/([+-]\d{2}:\d{2})$/);
  const timezone = matches ? matches[1] : "+00:00";
  return dayjs(val).utcOffset(timezone);
};

export const stringToDayjsZod = z.string().transform(stringToDayjs);

export const bookingCreateBodySchema = z.object({
  end: z.string().optional(),
  eventTypeId: z.number(),
  eventTypeSlug: z.string().optional(),
  rescheduleUid: z.string().optional(),
  recurringEventId: z.string().optional(),
  start: z.string(),
  timeZone: z.string().refine((value: string) => isSupportedTimeZone(value), { message: "Invalid timezone" }),
  user: z.union([z.string(), z.array(z.string())]).optional(),
  language: z.string(),
  bookingUid: z.string().optional(),
  metadata: z.record(z.string()),
  hasHashedBookingLink: z.boolean().optional(),
  hashedLink: z.string().nullish(),
  seatReferenceUid: z.string().optional(),
  orgSlug: z.string().optional(),
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

// `responses` is merged with it during handleNewBooking call because `responses` schema is dynamic and depends on eventType
export const extendedBookingCreateBody = bookingCreateBodySchema.merge(
  z.object({
    noEmail: z.boolean().optional(),
    recurringCount: z.number().optional(),
    allRecurringDates: z
      .array(
        z.object({
          start: z.string(),
          end: z.string(),
        })
      )
      .optional(),
    currentRecurringIndex: z.number().optional(),
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
    luckyUsers: z.array(z.number()).optional(),
    customInputs: z.undefined().optional(),
  })
);

// It has only the legacy props that are part of `responses` now. The API can still hit old props
export const bookingCreateSchemaLegacyPropsForApi = z.object({
  email: z.string(),
  name: z.string(),
  guests: z.array(z.string()).optional(),
  notes: z.string().optional(),
  location: z.string(),
  smsReminderNumber: z.string().optional().nullable(),
  rescheduleReason: z.string().optional(),
  customInputs: z.array(z.object({ label: z.string(), value: z.union([z.string(), z.boolean()]) })),
});

// This is the schema that is used for the API. It has all the legacy props that are part of `responses` now.
export const bookingCreateBodySchemaForApi = extendedBookingCreateBody.merge(
  bookingCreateSchemaLegacyPropsForApi.partial()
);

export const schemaBookingCancelParams = z.object({
  id: z.number().optional(),
  uid: z.string().optional(),
  allRemainingBookings: z.boolean().optional(),
  cancellationReason: z.string().optional(),
  seatReferenceUid: z.string().optional(),
});

export const vitalSettingsUpdateSchema = z.object({
  connected: z.boolean().optional(),
  selectedParam: z.string().optional(),
  sleepValue: z.number().optional(),
});

export const createdEventSchema = z
  .object({
    id: z.string(),
    thirdPartyRecurringEventId: z.string(),
    password: z.union([z.string(), z.undefined()]),
    onlineMeetingUrl: z.string().nullable(),
    iCalUID: z.string().optional(),
  })
  .passthrough();

const schemaDefaultConferencingApp = z.object({
  appSlug: z.string().default("daily-video").optional(),
  appLink: z.string().optional(),
});

export const userMetadata = z
  .object({
    proPaidForByTeamId: z.number().optional(),
    stripeCustomerId: z.string().optional(),
    vitalSettings: vitalSettingsUpdateSchema.optional(),
    isPremium: z.boolean().optional(),
    sessionTimeout: z.number().optional(), // Minutes
    defaultConferencingApp: schemaDefaultConferencingApp.optional(),
    defaultBookerLayouts: bookerLayouts.optional(),
    emailChangeWaitingForVerification: z
      .string()
      .transform((data) => data.toLowerCase())
      .optional(),
    migratedToOrgFrom: z
      .object({
        username: z.string().or(z.null()).optional(),
        lastMigrationTime: z.string().optional(),
        reverted: z.boolean().optional(),
        revertTime: z.string().optional(),
      })
      .optional(),
  })
  .nullable();

export type DefaultConferencingApp = z.infer<typeof schemaDefaultConferencingApp>;

export const orgSettingsSchema = z
  .object({
    isOrganizationVerified: z.boolean().optional(),
    isOrganizationConfigured: z.boolean().optional(),
    isAdminReviewed: z.boolean().optional(),
    orgAutoAcceptEmail: z.string().optional(),
  })
  .nullable();
export type userMetadataType = z.infer<typeof userMetadata>;

export const teamMetadataSchema = z
  .object({
    requestedSlug: z.string().or(z.null()),
    paymentId: z.string(),
    subscriptionId: z.string().nullable(),
    subscriptionItemId: z.string().nullable(),
    orgSeats: z.number().nullable(),
    orgPricePerSeat: z.number().nullable(),
    migratedToOrgFrom: z
      .object({
        teamSlug: z.string().or(z.null()).optional(),
        lastMigrationTime: z.string().optional(),
        reverted: z.boolean().optional(),
        lastRevertTime: z.string().optional(),
      })
      .optional(),
  })
  .partial()
  .nullable();

export const bookingMetadataSchema = z
  .object({
    videoCallUrl: z.string().optional(),
  })
  .and(z.record(z.string()))
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
    sendUpdatesTo: z.array(z.number()).optional(),
    sendToAll: z.boolean().optional(),
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
export const entries = <O extends Record<string, unknown>>(
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

export const getAccessLinkResponseSchema = z.object({
  download_link: z.string().url(),
});

export type GetAccessLinkResponseSchema = z.infer<typeof getAccessLinkResponseSchema>;

/** Facilitates converting values from Select inputs to plain ones before submitting */
export const optionToValueSchema = <T extends z.ZodTypeAny>(valueSchema: T) =>
  z
    .object({
      label: z.string(),
      value: valueSchema,
    })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .transform((foo) => (foo as any).value as z.infer<T>);

/**
 * Allows parsing without losing original data inference.
 * @url https://github.com/colinhacks/zod/discussions/1655#discussioncomment-4367368
 */
export const getParserWithGeneric =
  <T extends AnyZodObject>(valueSchema: T) =>
  <Data>(data: Data) => {
    type Output = z.infer<T>;
    type SimpleFormValues = string | number | null | undefined;
    return valueSchema.parse(data) as {
      // TODO: Invesitage why this broke on zod 3.22.2 upgrade
      [key in keyof Data]: Data[key] extends SimpleFormValues ? Data[key] : Output[key];
    };
  };
export const sendDailyVideoRecordingEmailsSchema = z.object({
  recordingId: z.string(),
  bookingUID: z.string(),
});

export const downloadLinkSchema = z.object({
  download_link: z.string(),
});

// All properties within event type that can and will be updated if needed
export const allManagedEventTypeProps: { [k in keyof Omit<Prisma.EventTypeSelect, "id">]: true } = {
  title: true,
  description: true,
  isInstantEvent: true,
  aiPhoneCallConfig: true,
  currency: true,
  periodDays: true,
  position: true,
  price: true,
  slug: true,
  length: true,
  offsetStart: true,
  locations: true,
  hidden: true,
  availability: true,
  recurringEvent: true,
  customInputs: true,
  disableGuests: true,
  requiresConfirmation: true,
  eventName: true,
  metadata: true,
  children: true,
  hideCalendarNotes: true,
  minimumBookingNotice: true,
  beforeEventBuffer: true,
  afterEventBuffer: true,
  successRedirectUrl: true,
  seatsPerTimeSlot: true,
  seatsShowAttendees: true,
  seatsShowAvailabilityCount: true,
  forwardParamsSuccessRedirect: true,
  periodType: true,
  hashedLink: true,
  webhooks: true,
  periodStartDate: true,
  periodEndDate: true,
  destinationCalendar: true,
  periodCountCalendarDays: true,
  bookingLimits: true,
  onlyShowFirstAvailableSlot: true,
  slotInterval: true,
  scheduleId: true,
  workflows: true,
  bookingFields: true,
  durationLimits: true,
  lockTimeZoneToggleOnBookingPage: true,
  requiresBookerEmailVerification: true,
  assignAllTeamMembers: true,
};

// All properties that are defined as unlocked based on all managed props
// Eventually this is going to be just a default and the user can change the config through the UI
export const unlockedManagedEventTypeProps = {
  locations: allManagedEventTypeProps.locations,
  scheduleId: allManagedEventTypeProps.scheduleId,
  destinationCalendar: allManagedEventTypeProps.destinationCalendar,
};

// The PR at https://github.com/colinhacks/zod/pull/2157 addresses this issue and improves email validation
// I introduced this refinement(to be used with z.email()) as a short term solution until we upgrade to a zod
// version that will include updates in the above PR.
export const emailSchemaRefinement = (value: string) => {
  const emailRegex = /^([A-Z0-9_+-]+\.?)*[A-Z0-9_+-]@([A-Z0-9][A-Z0-9-]*\.)+[A-Z]{2,}$/i;
  return emailRegex.test(value);
};

export const signupSchema = z.object({
  // Username is marked optional here because it's requirement depends on if it's the Organization invite or a team invite which isn't easily done in zod
  // It's better handled beyond zod in `validateAndGetCorrectedUsernameAndEmail`
  username: z.string().optional(),
  email: z.string().email({ message: "Invalid email" }),
  password: z.string().superRefine((data, ctx) => {
    const isStrict = false;
    const result = isPasswordValid(data, true, isStrict);
    Object.keys(result).map((key: string) => {
      if (!result[key as keyof typeof result]) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [key],
          message: key,
        });
      }
    });
  }),
  language: z.string().optional(),
  token: z.string().optional(),
});

export const ZVerifyCodeInputSchema = z.object({
  email: z.string().email(),
  code: z.string(),
});

export type ZVerifyCodeInputSchema = z.infer<typeof ZVerifyCodeInputSchema>;

export const coerceToDate = z.coerce.date();
export const getStringAsNumberRequiredSchema = (t: TFunction) =>
  z.string().min(1, t("error_required_field")).pipe(z.coerce.number());

export const bookingSeatDataSchema = z.object({
  description: z.string().optional(),
  responses: bookingResponses,
});

export const AIPhoneSettingSchema = z.object({
  yourPhoneNumber: z.string().refine((val) => isValidPhoneNumber(val)),
  numberToCall: z.string().refine((val) => isValidPhoneNumber(val)),
  guestName: z.string().trim().min(1, {
    message: "Please enter Guest Name",
  }),
  guestEmail: z.string().email().nullable().optional(),
  guestCompany: z.string().nullable().optional(),
  generalPrompt: z.string().trim().min(1, {
    message: "Please enter prompt",
  }),
  beginMessage: z.string().nullable(),
  eventTypeId: z.number(),
  calApiKey: z.string().trim().min(1, {
    message: "Please enter CAL API Key",
  }),
});

export const getRetellLLMSchema = z
  .object({
    general_prompt: z.string(),
    begin_message: z.string().nullable(),
    llm_id: z.string(),
    llm_websocket_url: z.string(),
    general_tools: z.array(
      z
        .object({
          name: z.string(),
          type: z.string(),
          cal_api_key: z.string().optional(),
          event_type_id: z.number().optional(),
          timezone: z.string().optional(),
        })
        .passthrough()
    ),
    states: z
      .array(
        z
          .object({
            name: z.string(),
            tools: z.array(
              z
                .object({
                  name: z.string(),
                  type: z.string(),
                  cal_api_key: z.string().optional(),
                  event_type_id: z.number().optional(),
                  timezone: z.string().optional(),
                })
                .passthrough()
            ),
          })
          .passthrough()
      )
      .nullable()
      .optional(),
  })
  .passthrough();

export type TGetRetellLLMSchema = z.infer<typeof getRetellLLMSchema>;
