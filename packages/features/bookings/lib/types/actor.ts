import { z } from "zod";

const UserActorSchema = z.object({
  identifiedBy: z.literal("user"),
  userUuid: z.string(),
});

const GuestActorSchema = z.object({
  identifiedBy: z.literal("guest"),
  email: z.string().optional(),
  name: z.string().optional(),
  phone: z.string().optional(),
});

const AttendeeActorSchema = z.object({
  identifiedBy: z.literal("attendee"),
  attendeeId: z.number(),
});

const ActorByIdSchema = z.object({
  identifiedBy: z.literal("id"),
  id: z.string(),
});

export const ActorSchema = z.discriminatedUnion("identifiedBy", [
  ActorByIdSchema,
  UserActorSchema,
  GuestActorSchema,
  AttendeeActorSchema,
]);

export type Actor = z.infer<typeof ActorSchema>;
type UserActor = z.infer<typeof UserActorSchema>;
type GuestActor = z.infer<typeof GuestActorSchema>;
type AttendeeActor = z.infer<typeof AttendeeActorSchema>;
type ActorById = z.infer<typeof ActorByIdSchema>;

/**
 * Creates an Actor representing a User by UUID
 */
export function makeUserActor(userUuid: string): UserActor {
  return {
    identifiedBy: "user",
    userUuid,
  };
}

/**
 * Creates an Actor representing the System
 * System actors must be referenced by ID (requires migration)
 */
export function makeSystemActor(): ActorById {
  return {
    identifiedBy: "id",
    id: SYSTEM_ACTOR_ID,
  };
}

/**
 * Creates an Actor representing a Guest (non-registered attendee)
 */
export function makeGuestActor(params: {
  email: string;
  name?: string;
  phone?: string;
}): GuestActor {
  return {
    identifiedBy: "guest",
    email: params.email,
    name: params.name,
    phone: params.phone,
  };
}

/**
 * Creates an Actor by existing actor ID
 */
export function makeActorById(id: string): ActorById {
  return {
    identifiedBy: "id",
    id,
  };
}

/**
 * Creates an Actor representing an Attendee by attendee ID
 */
export function makeAttendeeActor(attendeeId: number): AttendeeActor {
  return {
    identifiedBy: "attendee",
    attendeeId,
  };
}

// System actor ID constant
export const SYSTEM_ACTOR_ID = "00000000-0000-0000-0000-000000000000";