import { User, IdentityProvider, UserPlan } from "@prisma/client";
import * as z from "zod";

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

// Helper schema for JSON data
type Literal = boolean | null | number | string;
type Json = Literal | { [key: string]: Json } | Json[];
const literalSchema = z.union([z.string(), z.number(), z.boolean(), z.null()]);
const jsonSchema: z.ZodSchema<Json> = z.lazy(() =>
  z.union([literalSchema, z.array(jsonSchema), z.record(jsonSchema)])
);

export const _UserModel = z.object({
  id: z.number().int(),
  username: z.string().nullable(),
  name: z.string().nullable(),
  email: z.string(),
  emailVerified: z.date().nullable(),
  password: z.string().nullable(),
  bio: z.string().nullable(),
  avatar: z.string().nullable(),
  timeZone: z.string(),
  weekStart: z.string(),
  startTime: z.number().int(),
  endTime: z.number().int(),
  bufferTime: z.number().int(),
  hideBranding: z.boolean(),
  theme: z.string().nullable(),
  createdDate: z.date(),
  completedOnboarding: z.boolean(),
  locale: z.string().nullable(),
  twoFactorSecret: z.string().nullable(),
  twoFactorEnabled: z.boolean(),
  identityProvider: z.nativeEnum(IdentityProvider),
  identityProviderId: z.string().nullable(),
  invitedTo: z.number().int().nullable(),
  plan: z.nativeEnum(UserPlan),
  brandColor: z.string(),
  away: z.boolean(),
  metadata: jsonSchema.nullable(),
});

export interface CompleteUser extends User {
  eventTypes: CompleteEventType[];
  credentials: CompleteCredential[];
  teams: CompleteMembership[];
  bookings: CompleteBooking[];
  availability: CompleteAvailability[];
  selectedCalendars: CompleteSelectedCalendar[];
  Schedule: CompleteSchedule[];
  webhooks: CompleteWebhook[];
  destinationCalendar: CompleteDestinationCalendar | null;
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
    destinationCalendar: DestinationCalendarModel.nullable(),
  })
);
