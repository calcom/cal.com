import { withValidation } from "next-validations";
import { schemaEventType } from "./eventType";
// import { schemaCredential } from "./credential";
// import { schemaMembership } from "./membership";
// import { schemaBooking } from "./booking";
// import { schemaSchedule } from "./schedule";
// import { schemaSelectedCalendar } from "./selectedCalendar";
// import { schemaAvailability } from "./availability";
// import { schemaWebhook } from "./webhook";

import { z } from "zod";
import { schemaApiKey } from "./apiKey";

const schemaUser = z
  .object({
    username: z.string().min(3),
    name: z.string().min(3),
    email: z.string().email(), // max is a full day.
    emailVerified: z.date().optional(),
    password: z.string().optional(),
    bio: z.string().min(3).optional(),
    avatar: z.string().optional(),
    timeZone: z.string().default("Europe/London"),
    weekStart: z.string().default("Sunday"),
    bufferTime: z.number().default(0),
    hideBranding: z.boolean().default(false),
    theme: z.string().optional(),
    trialEndsAt: z.date().optional(),
    eventTypes: z.array((schemaEventType)).optional(),
    // credentials: z.array((schemaCredentials)).optional(),
    // teams: z.array((schemaMembership)).optional(),
    // bookings: z.array((schemaBooking)).optional(),
    // schedules: z.array((schemaSchedule)).optional(),
    defaultScheduleId: z.number().optional(),
    // selectedCalendars: z.array((schemaSelectedCalendar)).optional(),
    completedOnboarding: z.boolean().default(false),
    locale: z.string().optional(),
    timeFormat: z.number().optional().default(12),
    twoFactorEnabled: z.boolean().default(false),
    twoFactorSecret: z.string().optional(),
    identityProvider: z.enum(["CAL", "SAML", "GOOGLE"]).optional().default("CAL"),
    identityProviderId: z.string().optional(),
    // availavility: z.array((schemaAvailavility)).optional(),
    invitedTo: z.number().optional(),
    plan: z.enum(['FREE', 'TRIAL', 'PRO']).default("TRIAL"),
    // webhooks: z.array((schemaWebhook)).optional(),
    brandColor: z.string().default("#292929"),
    darkBrandColor: z.string().default("#fafafa"),
    // destinationCalendar:  z.instanceof(schemaEventType).optional(), // FIXME: instanceof doesnt work here
    away: z.boolean().default(false),
    metadata: z.object({}).optional(),
    verified: z.boolean().default(false),
    apiKeys: z.array((schemaApiKey)).optional(),
  })
  .strict(); // Adding strict so that we can disallow passing in extra fields
const withValidUser = withValidation({
  schema: schemaUser,
  type: "Zod",
  mode: "body",
});

export { schemaUser, withValidUser };
