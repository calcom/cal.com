import type { GetServerSidePropsContext } from "next";
import { unstable_cache } from "next/cache";

import { eventTypeMetaDataSchemaWithTypedApps } from "@calcom/app-store/zod-utils";
import { getTeamData } from "@calcom/features/ee/teams/lib/getTeamData";
import {
  getEventTypeHosts,
  getProfileFromEvent,
  getUsersFromEvent,
  processEventDataShared,
} from "@calcom/features/eventtypes/lib/getPublicEvent";
import { getTeamEventType } from "@calcom/features/eventtypes/lib/getTeamEventType";
import { FeaturesRepository } from "@calcom/features/flags/features.repository";
import { NEXTJS_CACHE_TTL } from "@calcom/lib/constants";
import { getPlaceholderAvatar } from "@calcom/lib/defaultAvatarImage";
import { TeamRepository } from "@calcom/lib/server/repository/team";
import { UserRepository } from "@calcom/features/users/repositories/UserRepository";
import { prisma } from "@calcom/prisma";
import type { Prisma } from "@calcom/prisma/client";
import type { SchedulingType } from "@calcom/prisma/enums";

export async function getCachedTeamData(teamSlug: string, orgSlug: string | null) {
  return unstable_cache(async () => getTeamData(teamSlug, orgSlug), ["team-data", teamSlug, orgSlug ?? ""], {
    revalidate: NEXTJS_CACHE_TTL,
    tags: [`team:${orgSlug ? `${orgSlug}:` : ""}${teamSlug}`],
  })();
}

export async function getCachedTeamEventType(teamSlug: string, meetingSlug: string, orgSlug: string | null) {
  return unstable_cache(
    async () => getTeamEventType(teamSlug, meetingSlug, orgSlug),
    ["team-event-type", teamSlug, meetingSlug, orgSlug ?? ""],
    {
      revalidate: NEXTJS_CACHE_TTL,
      tags: [`event-type:${orgSlug ? `${orgSlug}:` : ""}${teamSlug}:${meetingSlug}`],
    }
  )();
}

export async function getEnrichedEventType({
  teamSlug,
  meetingSlug,
  orgSlug,
  fromRedirectOfNonOrgLink,
}: {
  teamSlug: string;
  meetingSlug: string;
  orgSlug: string | null;
  fromRedirectOfNonOrgLink: boolean;
}) {
  const [teamData, eventType] = await Promise.all([
    getCachedTeamData(teamSlug, orgSlug),
    getCachedTeamEventType(teamSlug, meetingSlug, orgSlug),
  ]);

  if (!teamData || !eventType) {
    return null;
  }

  const { subsetOfHosts, hosts } = await getEventTypeHosts({
    hosts: eventType.hosts,
    prisma,
  });

  const enrichedOwner = eventType.owner
    ? await new UserRepository(prisma).enrichUserWithItsProfile({
        user: eventType.owner,
      })
    : null;
  const users =
    (await getUsersFromEvent({ ...eventType, owner: enrichedOwner, subsetOfHosts, hosts }, prisma)) ?? [];
  const name = teamData.parent?.name ?? teamData.name ?? null;
  const isUnpublished = teamData.parent ? !teamData.parent.slug : !teamData.slug;

  const eventMetaData = eventTypeMetaDataSchemaWithTypedApps.parse(eventType.metadata);

  const eventDataShared = await processEventDataShared({
    eventData: eventType,
    metadata: eventMetaData,
    prisma,
  });

  return {
    ...eventDataShared,
    owner: enrichedOwner,
    subsetOfHosts,
    hosts,
    profile: getProfileFromEvent({ ...eventType, owner: enrichedOwner, subsetOfHosts, hosts }),
    subsetOfUsers: users,
    users,
    entity: {
      fromRedirectOfNonOrgLink,
      considerUnpublished: isUnpublished && !fromRedirectOfNonOrgLink,
      orgSlug,
      teamSlug: teamData.slug ?? null,
      name,
      hideProfileLink: false,
      logoUrl: teamData.parent
        ? getPlaceholderAvatar(teamData.parent.logoUrl, teamData.parent.name)
        : getPlaceholderAvatar(teamData.logoUrl, teamData.name),
    },
  };
}

export async function shouldUseApiV2ForTeamSlots(teamId: number): Promise<boolean> {
  const featureRepo = new FeaturesRepository(prisma);
  const teamHasApiV2Route = await featureRepo.checkIfTeamHasFeature(teamId, "use-api-v2-for-team-slots");
  const useApiV2 = teamHasApiV2Route && Boolean(process.env.NEXT_PUBLIC_API_V2_URL);

  return useApiV2;
}

export async function getCRMData(
  query: GetServerSidePropsContext["query"],
  eventData: {
    id: number;
    isInstantEvent: boolean;
    schedulingType: SchedulingType | null;
    metadata: Prisma.JsonValue | null;
    length: number;
  }
) {
  const crmContactOwnerEmail = query["cal.crmContactOwnerEmail"];
  const crmContactOwnerRecordType = query["cal.crmContactOwnerRecordType"];
  const crmAppSlugParam = query["cal.crmAppSlug"];
  const crmRecordIdParam = query["cal.crmRecordId"];

  let teamMemberEmail = Array.isArray(crmContactOwnerEmail) ? crmContactOwnerEmail[0] : crmContactOwnerEmail;
  let crmOwnerRecordType = Array.isArray(crmContactOwnerRecordType)
    ? crmContactOwnerRecordType[0]
    : crmContactOwnerRecordType;
  let crmAppSlug = Array.isArray(crmAppSlugParam) ? crmAppSlugParam[0] : crmAppSlugParam;
  let crmRecordId = Array.isArray(crmRecordIdParam) ? crmRecordIdParam[0] : crmRecordIdParam;

  if (!teamMemberEmail || !crmOwnerRecordType || !crmAppSlug) {
    const { getTeamMemberEmailForResponseOrContactUsingUrlQuery } = await import(
      "@calcom/features/ee/teams/lib/getTeamMemberEmailFromCrm"
    );
    const {
      email,
      recordType,
      crmAppSlug: crmAppSlugQuery,
      recordId: crmRecordIdQuery,
    } = await getTeamMemberEmailForResponseOrContactUsingUrlQuery({
      query,
      eventData,
    });

    teamMemberEmail = email ?? undefined;
    crmOwnerRecordType = recordType ?? undefined;
    crmAppSlug = crmAppSlugQuery ?? undefined;
    crmRecordId = crmRecordIdQuery ?? undefined;
  }

  return {
    teamMemberEmail,
    crmOwnerRecordType,
    crmAppSlug,
    crmRecordId,
  };
}

export async function getTeamId(teamSlug: string, orgSlug: string | null): Promise<number | null> {
  const teamRepo = new TeamRepository(prisma);
  const team = await teamRepo.findFirstBySlugAndParentSlug({
    slug: teamSlug,
    parentSlug: orgSlug,
    select: { id: true },
  });

  return team?.id ?? null;
}
