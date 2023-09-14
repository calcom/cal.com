import hasKeyInMetadata from "@calcom/lib/hasKeyInMetadata";
import type { Prisma } from "@calcom/prisma/client";

type EventTypeOwnerType = {
  team?: {
    metadata: Prisma.JsonValue;
  } | null;
  owner?: {
    metadata: Prisma.JsonValue;
    teams: {
      accepted: boolean;
      team: {
        metadata: Prisma.JsonValue;
      };
    }[];
  } | null;
};

export function isEventTypeOwnerKYCVerified(eventType?: EventTypeOwnerType | null) {
  if (!eventType) return false;

  if (eventType.team) {
    const isKYCVerified =
      eventType.team &&
      hasKeyInMetadata(eventType.team, "kycVerified") &&
      !!eventType.team.metadata.kycVerified;
    return isKYCVerified;
  }

  if (eventType.owner) {
    const isKYCVerified =
      eventType.owner &&
      hasKeyInMetadata(eventType.owner, "kycVerified") &&
      !!eventType.owner.metadata.kycVerified;
    if (isKYCVerified) return isKYCVerified;

    const isPartOfVerifiedTeam = eventType.owner.teams.find(
      (team) =>
        team.accepted && hasKeyInMetadata(team.team, "kycVerified") && !!team.team.metadata.kycVerified
    );
    return !!isPartOfVerifiedTeam;
  }

  return false;
}
