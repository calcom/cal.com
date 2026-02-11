import type {
  UserActor,
  GuestActor,
  AttendeeActor,
  ActorById,
  AppActorByCredentialId,
  AppActorBySlug,
} from "./dto/types";
import { v4 as uuidv4 } from "uuid";

const SYSTEM_ACTOR_ID = "00000000-0000-0000-0000-000000000000";

/**
 * Creates an Actor representing a User by UUID
 */
export function makeUserActor(userUuid: string): UserActor {
  return {
    identifiedBy: "user",
    userUuid,
  };
}

export function makeGuestActor({ email, name }: { email: string; name: string | null }): GuestActor {
  return {
    identifiedBy: "guest",
    email,
    name: name ?? null,
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

/**
 * Creates an Actor representing an App by credential ID (preferred)
 * The credentialId uniquely identifies which app instance (e.g., which Stripe account)
 * App name and slug are derived from the credential at display time
 */
export function makeAppActor(params: { credentialId: number }): AppActorByCredentialId {
  return {
    identifiedBy: "app",
    credentialId: params.credentialId,
  };
}

/**
 * Creates an Actor representing an App by app slug (fallback)
 * Used when credentialId is not available or for apps not yet migrated
 * App actors use @app.internal email convention
 */
export function makeAppActorUsingSlug(params: { appSlug: string; name: string }): AppActorBySlug {
  return {
    identifiedBy: "appSlug",
    appSlug: params.appSlug,
    name: params.name,
  };
}

/**
 * identifier should be unique for that actor
 */
export function buildActorEmail({
  identifier,
  actorType,
}: {
  identifier: string;
  actorType: "system" | "guest" | "app";
}): string {
  return `${identifier}@${actorType}.internal`;
}

export function getUniqueIdentifier({ prefix }: { prefix: string }): string {
  return `${prefix}-${uuidv4()}`;
}
