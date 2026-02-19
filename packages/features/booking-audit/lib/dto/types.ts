import { z } from "zod";

const UserActorSchema = z.object({
  identifiedBy: z.literal("user"),
  userUuid: z.string(),
});

const AttendeeActorSchema = z.object({
  identifiedBy: z.literal("attendee"),
  attendeeId: z.number(),
});

const ActorByIdSchema = z.object({
  identifiedBy: z.literal("id"),
  id: z.string(),
});

const GuestActorSchema = z.object({
  identifiedBy: z.literal("guest"),
  email: z.string(),
  name: z.string().nullable(),
});

const AppActorByCredentialIdSchema = z.object({
  identifiedBy: z.literal("app"),
  credentialId: z.number(),
});

const AppActorBySlugSchema = z.object({
  identifiedBy: z.literal("appSlug"),
  appSlug: z.string(),
  name: z.string(),
});

export const ActorSchema = z.discriminatedUnion("identifiedBy", [
  ActorByIdSchema,
  UserActorSchema,
  AttendeeActorSchema,
  GuestActorSchema,
  AppActorByCredentialIdSchema,
  AppActorBySlugSchema,
]);

export const PiiFreeActorSchema = z.discriminatedUnion("identifiedBy", [
  ActorByIdSchema,
  UserActorSchema,
  AttendeeActorSchema,
]);

export type Actor = z.infer<typeof ActorSchema>;
export type PiiFreeActor = z.infer<typeof PiiFreeActorSchema>;

export type UserActor = z.infer<typeof UserActorSchema>;
export type GuestActor = z.infer<typeof GuestActorSchema>;
export type AttendeeActor = z.infer<typeof AttendeeActorSchema>;
export type ActorById = z.infer<typeof ActorByIdSchema>;
export type AppActorByCredentialId = z.infer<typeof AppActorByCredentialIdSchema>;
export type AppActorBySlug = z.infer<typeof AppActorBySlugSchema>;

/**
 * Schema for booking audit context - Records things that are common across all actions but could be useful to capture when the action is performed.
 * e.g. impersonation, userAgent, ip etc.
 * This is separate from action-specific data because impersonation is orthogonal to the action type
 */
export const BookingAuditContextSchema = z.object({
  impersonatedBy: z.string().optional(),
});

export type BookingAuditContext = z.infer<typeof BookingAuditContextSchema>;
