/**
 * Represents the entity that performed a booking action
 */
export type Actor = {
  /**
   * The type of actor performing the action
   */
  type: "User" | "System" | "Attendee";

  /**
   * The user ID if the actor is a User or Attendee
   * Null if the actor is the System
   */
  userId?: number | null;

  /**
   * Additional metadata about the actor
   * e.g., email for Attendee, automation name for System
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
 * Creates an Actor representing an Attendee
 */
export function createAttendeeActor(email: string, metadata?: Actor["metadata"]): Actor {
  return {
    type: "Attendee",
    userId: null,
    metadata: {
      ...metadata,
      email,
    },
  };
}

/**
 * Extracts the user ID from an actor if available
 */
export function getActorUserId(actor?: Actor): number | null | undefined {
  return actor?.userId;
}

/**
 * Converts an actor to the string representation needed for audit logs
 */
export function actorToAuditString(actor?: Actor): string | null {
  if (!actor) return null;

  if (actor.type === "User") {
    return `User:${actor.userId}`;
  }

  if (actor.type === "Attendee" && actor.metadata?.email) {
    return `Attendee:${actor.metadata.email}`;
  }

  if (actor.type === "System") {
    return actor.metadata?.automationName ? `System:${actor.metadata.automationName}` : "System";
  }

  return null;
}
