import type { AuditActorType } from "../repository/IAuditActorRepository";
import type { BookingAuditWithActor } from "../repository/IBookingAuditRepository";
import { getAppNameFromSlug } from "../getAppNameFromSlug";
import type { DataRequirements, EnrichmentDataStore } from "./EnrichmentDataStore";

type ActorEnrichmentResult = {
  displayName: string;
  displayEmail: string | null;
  displayAvatar: string | null;
};

type Actor = BookingAuditWithActor["actor"];

type ActorStrategy = {
  getRequirements: (actor: Actor) => DataRequirements;
  enrich: (actor: Actor, dbStore: EnrichmentDataStore) => ActorEnrichmentResult;
};

export const ACTOR_STRATEGIES: Record<AuditActorType, ActorStrategy> = {
  USER: {
    getRequirements: (actor) => ({ userUuids: actor.userUuid ? [actor.userUuid] : [] }),
    enrich: (actor, dbStore) => {
      if (!actor.userUuid) {
        throw new Error("User UUID is required for USER actor");
      }
      const user = dbStore.getUserByUuid(actor.userUuid);
      if (user) {
        return {
          displayName: user.name || user.email,
          displayEmail: user.email,
          displayAvatar: user.avatarUrl || null,
        };
      }
      return {
        displayName: "Deleted User",
        displayEmail: null,
        displayAvatar: null,
      };
    },
  },
  ATTENDEE: {
    getRequirements: (actor) => ({ attendeeIds: actor.attendeeId ? [actor.attendeeId] : [] }),
    enrich: (actor, dbStore) => {
      if (!actor.attendeeId) {
        throw new Error("Attendee ID is required for ATTENDEE actor");
      }
      const attendee = dbStore.getAttendeeById(actor.attendeeId);
      if (attendee) {
        return {
          displayName: attendee.name || attendee.email,
          displayEmail: attendee.email,
          displayAvatar: null,
        };
      }
      return {
        displayName: "Deleted Attendee",
        displayEmail: null,
        displayAvatar: null,
      };
    },
  },
  APP: {
    getRequirements: (actor) => ({ credentialIds: actor.credentialId ? [actor.credentialId] : [] }),
    enrich: (actor, dbStore) => {
      const credential = actor.credentialId ? dbStore.getCredentialById(actor.credentialId) : null;
      return {
        displayName: credential ? getAppNameFromSlug({ appSlug: credential.appId }) : (actor.name ?? "Deleted App"),
        displayEmail: null,
        displayAvatar: null,
      };
    },
  },
  SYSTEM: {
    getRequirements: () => ({}),
    enrich: () => ({ displayName: "Cal.com", displayEmail: null, displayAvatar: null }),
  },
  GUEST: {
    getRequirements: () => ({}),
    enrich: (actor) => ({ displayName: actor.name || "Guest", displayEmail: null, displayAvatar: null }),
  },
};

/**
 * Get data requirements for actor enrichment using the strategy pattern
 */
export function getActorDataRequirements(actor: Actor): DataRequirements {
  return ACTOR_STRATEGIES[actor.type].getRequirements(actor);
}

/**
 * Enrich actor information using the strategy pattern
 */
export function enrichActor(actor: Actor, dbStore: EnrichmentDataStore): ActorEnrichmentResult {
  return ACTOR_STRATEGIES[actor.type].enrich(actor, dbStore);
}
