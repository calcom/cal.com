import { z } from "zod";
import type { IAuditActorRepository } from "@calcom/features/booking-audit/lib/repository/IAuditActorRepository";

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

export const ActorSchema = z.discriminatedUnion("identifiedBy", [
  ActorByIdSchema,
  UserActorSchema,
  AttendeeActorSchema,
]);

export type Actor = z.infer<typeof ActorSchema>;
type UserActor = z.infer<typeof UserActorSchema>;
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

/**
 * Producer-side actor resolution - creates PII-free actors for queueing
 * 
 * For guests: Creates AuditActor record in DB upfront, returns ActorById
 * For users/attendees: Returns ID-only actors
 * 
 * Callers must provide userUuid (not userId) - if user is known, userUuid must be available
 * Callers must provide attendeeId if they want AttendeeActor - no automatic lookup
 * 
 * @param params.userUuid - User UUID (required, nullable)
 * @param params.attendeeId - Attendee ID (required, nullable)
 * @param params.guestActor - Guest actor info with email and optional name (required, nullable)
 * @param params.auditActorRepository - Repository for creating guest actors
 * @returns Actor with no PII (only IDs)
 */
export async function getPIIFreeBookingAuditActor(params: {
  userUuid: string | null;
  attendeeId: number | null;
  guestActor: { email: string; name?: string } | null;
  auditActorRepository: IAuditActorRepository;
}): Promise<Actor> {
  const { userUuid, attendeeId, guestActor, auditActorRepository } = params;

  if (userUuid) {
    return makeUserActor(userUuid);
  }

  if (attendeeId) {
    return makeAttendeeActor(attendeeId);
  }

  if (!guestActor) {
    throw new Error("At least one of userUuid, attendeeId, or guestActor must be provided");
  }

  const createdGuestActor = await auditActorRepository.createIfNotExistsGuestActor({
    email: guestActor.email,
    name: guestActor.name ?? null,
    phone: null,
  });
  return makeActorById(createdGuestActor.id);
}