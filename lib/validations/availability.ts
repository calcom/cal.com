import { withValidation } from "next-validations";
import { z } from "zod";

const schemaAvailability = z
  .object({
    uid: z.string().min(3),
    title: z.string().min(3),
    description: z.string().min(3).optional(),
    startTime: z.date().or(z.string()),
    endTime: z.date(),
    location: z.string().min(3).optional(),
    createdAt: z.date().or(z.string()),
    updatedAt: z.date(),
    confirmed: z.boolean().default(true),
    rejected: z.boolean().default(false),
    paid: z.boolean().default(false),

    // bufferTime: z.number().default(0),
    // // attendees: z.array((schemaSchedule)).optional(),

    // startTime: z.string().min(3),
    // endTime: z.string().min(3),
    // email: z.string().email(), // max is a full day.
    // emailVerified: z.date().optional(),
    // password: z.string().optional(),
    // bio: z.string().min(3).optional(),
    // avatar: z.string().optional(),
    // timeZone: z.string().default("Europe/London"),
    // weekStart: z.string().default("Sunday"),
    // bufferTime: z.number().default(0),
    // theme: z.string().optional(),
    // trialEndsAt: z.date().optional(),
    // eventTypes: z.array((schemaEventType)).optional(),
    // // credentials: z.array((schemaCredentials)).optional(),
    // // teams: z.array((schemaMembership)).optional(),
    // // bookings: z.array((schemaAvailability)).optional(),
    // // schedules: z.array((schemaSchedule)).optional(),
    // defaultScheduleId: z.number().optional(),
    // // selectedCalendars: z.array((schemaSelectedCalendar)).optional(),
    // completedOnboarding: z.boolean().default(false),
    // locale: z.string().optional(),
    // timeFormat: z.number().optional().default(12),
    // twoFactorEnabled: z.boolean().default(false),
    // twoFactorSecret: z.string().optional(),
    // identityProvider: z.enum(["CAL", "SAML", "GOOGLE"]).optional().default("CAL"),
    // identityProviderId: z.string().optional(),
    // // availavility: z.array((schemaAvailavility)).optional(),
    // invitedTo: z.number().optional(),
    // plan: z.enum(['FREE', 'TRIAL', 'PRO']).default("TRIAL"),
    // // webhooks: z.array((schemaWebhook)).optional(),
    // brandColor: z.string().default("#292929"),
    // darkBrandColor: z.string().default("#fafafa"),
    // // destinationCalendar:  z.instanceof(schemaEventType).optional(), // FIXME: instanceof doesnt work here
    // away: z.boolean().default(false),
    // metadata: z.object({}).optional(),
    // verified: z.boolean().default(false),
  })
  .strict(); 
const withValidAvailability = withValidation({
  schema: schemaAvailability,
  type: "Zod",
  mode: "body",
});

export { schemaAvailability, withValidAvailability };
