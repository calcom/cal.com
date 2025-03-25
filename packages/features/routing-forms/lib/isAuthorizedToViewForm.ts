import type { Prisma } from "@calcom/prisma/client";
import { userMetadata } from "@calcom/prisma/zod-utils";

type FormUser = {
  username: string | null;
  metadata: Prisma.JsonValue;
  movedToProfileId: number | null;
  profile: {
    organization: { slug: string | null; requestedSlug: string | null } | null;
  };
  id: number;
};

type FormTeam = {
  parent: {
    slug: string | null;
  } | null;
} | null;

export function isAuthorizedToViewFormOnOrgDomain({
  user,
  currentOrgDomain,
  team,
}: {
  user: FormUser;
  currentOrgDomain: string | null;
  team?: FormTeam;
}) {
  const formUser = {
    ...user,
    metadata: userMetadata.parse(user.metadata),
  };
  const orgSlug = formUser.profile.organization?.slug ?? formUser.profile.organization?.requestedSlug ?? null;
  const teamOrgSlug = team?.parent?.slug ?? null;

  if (!currentOrgDomain) {
    // If not on org domain, let's allow serving any form belong to any organization so that even if the form owner is migrate to an organization, old links for the form keep working
    return true;
  } else if (currentOrgDomain === orgSlug || currentOrgDomain === teamOrgSlug) {
    // If on org domain, allow if:
    // 1. The form belongs to a user who is part of the organization (orgSlug matches)
    // 2. The form belongs to a team that is part of the organization (teamOrgSlug matches)
    return true;
  }
  return false;
}
