import { withValidation } from "next-validations";
import { z } from "zod";

import { schemaEventType } from "./eventType";
import { schemaApiKey } from "./apiKey";
import { schemaDestinationCalendar } from "./destination-calendar";
import { schemaWebhook } from "./webhook";
import { schemaAvailability } from "./availability";
import { schemaSelectedCalendar } from "./selected-calendar";
import { schemaBooking } from "./booking";
import { schemaMembership } from "./membership";
import { schemaSchedule } from "./schedule";
import { schemaCredential } from "./credential";

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
    credentials: z.array((schemaCredential)).optional(),
    teams: z.array((schemaMembership)).optional(),
    bookings: z.array((schemaBooking)).optional(),
    schedules: z.array((schemaSchedule)).optional(),
    defaultScheduleId: z.number().optional(),
    selectedCalendars: z.array((schemaSelectedCalendar)).optional(),
    completedOnboarding: z.boolean().default(false),
    locale: z.string().optional(),
    timeFormat: z.number().optional().default(12),
    twoFactorEnabled: z.boolean().default(false),
    twoFactorSecret: z.string().optional(),
    identityProvider: z.enum(["CAL", "SAML", "GOOGLE"]).optional().default("CAL"),
    identityProviderId: z.string().optional(),
    availability: z.array((schemaAvailability)).optional(),
    invitedTo: z.number().optional(),
    plan: z.enum(['FREE', 'TRIAL', 'PRO']).default("TRIAL"),
    webhooks: z.array((schemaWebhook)).optional(),
    brandColor: z.string().default("#292929"),
    darkBrandColor: z.string().default("#fafafa"),
    destinationCalendar:  z.array(schemaDestinationCalendar).optional(), // FIXME: instanceof doesnt work here
    away: z.boolean().default(false),
    metadata: z.object({}).optional(),
    verified: z.boolean().default(false),
    apiKeys: z.array((schemaApiKey)).optional(),
  })
  .strict(); 
const withValidUser = withValidation({
  schema: schemaUser,
  type: "Zod",
  mode: "body",
});

export { schemaUser, withValidUser };
