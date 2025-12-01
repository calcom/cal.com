/**
 * Represents the entity that performed a booking action
 * Uses discriminating union for type-safe actor identification
 */
export type Actor = ActorById | UserActor | AttendeeActor | GuestActor;

/**
 * Actor referenced by existing ID in AuditActor table
 * Use this for System actors or when you already have an actor ID
 */
type ActorById = {
  identifiedBy: "id";
  id: string; // UUID of existing actor (including System actor)
};

/**
 * Actor identified by user UUID
 * Will be upserted in AuditActor table
 */
type UserActor = {
  identifiedBy: "user";
  userUuid: string;
};

/**
 * Actor identified by attendee ID
 * Must already exist in AuditActor table
 */
type AttendeeActor = {
  identifiedBy: "attendee";
  attendeeId: number;
};

/**
 * Actor identified by guest data (email, name, phone)
 * Will be upserted in AuditActor table
 */
type GuestActor = {
  identifiedBy: "guest";
  email?: string;
  name?: string;
  phone?: string;
};

// System actor ID constant
export const SYSTEM_ACTOR_ID = "00000000-0000-0000-0000-000000000000";

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
export function makeGuestActor(email: string, name?: string, phone?: string): GuestActor {
  return {
    identifiedBy: "guest",
    email,
    name,
    phone,
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