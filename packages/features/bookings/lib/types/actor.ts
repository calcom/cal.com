/**
 * Represents the entity that performed a booking action
 */
export type Actor = {
  /**
   * The type of actor performing the action
   * Must match ActorType enum in Prisma schema
   */
  type: "User" | "Guest" | "System";

  /**
   * The user ID if the actor is a User (registered Cal.com user)
   * Null for Guest (non-registered) and System actors
   */
  userId?: number | null;

  /**
   * Additional metadata about the actor
   * e.g., email for Guest, automation name for System
   */
  metadata?: {
    email?: string;
    name?: string;
    automationName?: string;
    [key: string]: unknown;
  };
};

/**
 * Creates an Actor representing a User
 */
export function createUserActor(userId: number, metadata?: Actor["metadata"]): Actor {
  return {
    type: "User",
    userId,
    metadata,
  };
}

/**
 * Creates an Actor representing the System
 */
export function createSystemActor(metadata?: Actor["metadata"]): Actor {
  return {
    type: "System",
    userId: null,
    metadata,
  };
}

/**
 * Creates an Actor representing a Guest (non-registered attendee)
 */
export function createGuestActor(email: string, metadata?: Actor["metadata"]): Actor {
  return {
    type: "Guest",
    userId: null,
    metadata: {
      ...metadata,
      email,
    },
  };
}

export const createAttendeeActor = createGuestActor;

/**
 * Extracts the user ID from an actor if available
 * Returns undefined if the actor has no userId (null or undefined)
 */
export function getActorUserId(actor: Actor): number | undefined {
  return actor.userId ?? undefined;
}

/**
 * Converts an actor to the string representation needed for audit logs
 */
export function actorToAuditString(actor?: Actor): string | null {
  if (!actor) return null;

  if (actor.type === "User") {
    return `User:${actor.userId}`;
  }

  if (actor.type === "Guest" && actor.metadata?.email) {
    return `Guest:${actor.metadata.email}`;
  }

  if (actor.type === "System") {
    return actor.metadata?.automationName ? `System:${actor.metadata.automationName}` : "System";
  }

  return null;
}
