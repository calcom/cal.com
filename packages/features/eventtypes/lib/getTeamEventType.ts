import { getSlugOrRequestedSlug } from "@calcom/features/ee/organizations/lib/orgDomains";
import { prisma } from "@calcom/prisma";

import { getPublicEventSelect } from "./getPublicEvent";

export async function getTeamEventType(teamSlug: string, meetingSlug: string, orgSlug: string | null) {
  return await prisma.eventType.findFirst({
    where: {
      team: {
        ...getSlugOrRequestedSlug(teamSlug),
        parent: orgSlug ? getSlugOrRequestedSlug(orgSlug) : null,
      },
      OR: [{ slug: meetingSlug }, { slug: { startsWith: `${meetingSlug}-team-id-` } }],
    },
    // IMPORTANT:
    // This ensures that the queried event type has everything expected in Booker
    select: getPublicEventSelect(false),
    orderBy: {
      slug: "asc",
    },
  });
}
