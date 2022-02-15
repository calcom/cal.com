import * as z from "zod";
import * as imports from "../zod-utils";
import { IdentityProvider, UserPlan } from "@prisma/client";
import {
  CompleteEventType,
  EventTypeModel,
  CompleteCredential,
  CredentialModel,
  CompleteMembership,
  MembershipModel,
  CompleteBooking,
  BookingModel,
  CompleteAvailability,
  AvailabilityModel,
  CompleteSelectedCalendar,
  SelectedCalendarModel,
  CompleteSchedule,
  ScheduleModel,
  CompleteWebhook,
  WebhookModel,
  CompleteDestinationCalendar,
  DestinationCalendarModel,
} from "./index";

// Helper schema for JSON fields
type Literal = boolean | number | string;
type Json = Literal | { [key: string]: Json } | Json[];
const literalSchema = z.union([z.string(), z.number(), z.boolean()]);
const jsonSchema: z.ZodSchema<Json> = z.lazy(() =>
  z.union([literalSchema, z.array(jsonSchema), z.record(jsonSchema)])
);

export const _UserModel = z.object({
  id: z.number().int(),
  username: z.string().nullish(),
  name: z.string().nullish(),
  email: z.string().email(),
  emailVerified: z.date().nullish(),
  password: z.string().nullish(),
  bio: z.string().nullish(),
  avatar: z.string().nullish(),
  timeZone: z.string(),
  weekStart: z.string(),
  startTime: z.number().int(),
  endTime: z.number().int(),
  bufferTime: z.number().int(),
  hideBranding: z.boolean(),
  theme: z.string().nullish(),
  createdDate: z.date(),
  completedOnboarding: z.boolean(),
  locale: z.string().nullish(),
  twoFactorSecret: z.string().nullish(),
  twoFactorEnabled: z.boolean(),
  identityProvider: z.nativeEnum(IdentityProvider),
  identityProviderId: z.string().nullish(),
  invitedTo: z.number().int().nullish(),
  plan: z.nativeEnum(UserPlan),
  brandColor: z.string(),
  away: z.boolean(),
  metadata: jsonSchema,
  verified: z.boolean().nullish(),
});

export interface CompleteUser extends z.infer<typeof _UserModel> {
  eventTypes: CompleteEventType[];
  credentials: CompleteCredential[];
  teams: CompleteMembership[];
  bookings: CompleteBooking[];
  availability: CompleteAvailability[];
  selectedCalendars: CompleteSelectedCalendar[];
  Schedule: CompleteSchedule[];
  webhooks: CompleteWebhook[];
  destinationCalendar?: CompleteDestinationCalendar | null;
}

/**
 * UserModel contains all relations on your model in addition to the scalars
 *
 * NOTE: Lazy required in case of potential circular dependencies within schema
 */
export const UserModel: z.ZodSchema<CompleteUser> = z.lazy(() =>
  _UserModel.extend({
    eventTypes: EventTypeModel.array(),
    credentials: CredentialModel.array(),
    teams: MembershipModel.array(),
    bookings: BookingModel.array(),
    availability: AvailabilityModel.array(),
    selectedCalendars: SelectedCalendarModel.array(),
    Schedule: ScheduleModel.array(),
    webhooks: WebhookModel.array(),
    destinationCalendar: DestinationCalendarModel.nullish(),
  })
);
