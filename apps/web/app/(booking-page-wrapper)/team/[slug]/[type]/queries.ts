import type { Prisma } from "@prisma/client";
import type { GetServerSidePropsContext } from "next";
import { unstable_cache } from "next/cache";

import { getSlugOrRequestedSlug } from "@calcom/features/ee/organizations/lib/orgDomains";
import {
  getEventTypeHosts,
  getProfileFromEvent,
  getUsersFromEvent,
  processEventDataShared,
} from "@calcom/features/eventtypes/lib/getPublicEvent";
import { getPublicEventSelect } from "@calcom/features/eventtypes/lib/getPublicEvent";
import { FeaturesRepository } from "@calcom/features/flags/features.repository";
import { NEXTJS_CACHE_TTL } from "@calcom/lib/constants";
import { getPlaceholderAvatar } from "@calcom/lib/defaultAvatarImage";
import { UserRepository } from "@calcom/lib/server/repository/user";
import { prisma } from "@calcom/prisma";
import type { SchedulingType } from "@calcom/prisma/enums";
import { eventTypeMetaDataSchemaWithTypedApps } from "@calcom/prisma/zod-utils";

export const getCachedTeamWithEventTypes = unstable_cache(
  async (teamSlug: string, meetingSlug: string, orgSlug: string | null) => {
    return await _getTeamWithEventTypes(teamSlug, meetingSlug, orgSlug);
  },
  undefined,
  {
    revalidate: NEXTJS_CACHE_TTL,
  }
);

export type TeamWithEventTypes = Awaited<ReturnType<typeof _getTeamWithEventTypes>>;

async function _getTeamWithEventTypes(teamSlug: string, meetingSlug: string, orgSlug: string | null) {
  const team = await prisma.team.findFirst({
    where: {
      ...getSlugOrRequestedSlug(teamSlug),
      parent: orgSlug ? getSlugOrRequestedSlug(orgSlug) : null,
    },
    orderBy: {
      slug: { sort: "asc", nulls: "last" },
    },
    select: {
      id: true,
      isPrivate: true,
      hideBranding: true,
      parent: {
        select: {
          id: true,
          slug: true,
          name: true,
          bannerUrl: true,
          logoUrl: true,
          hideBranding: true,
          organizationSettings: {
            select: {
              allowSEOIndexing: true,
            },
          },
        },
      },
      logoUrl: true,
      name: true,
      slug: true,
      brandColor: true,
      darkBrandColor: true,
      theme: true,
      eventTypes: {
        where: {
          OR: [{ slug: meetingSlug }, { slug: { startsWith: `${meetingSlug}-team-id-` } }],
        },
        // IMPORTANT:
        // This is to ensure that `team.eventTypes[0]` (used for event data in team booking page)
        // has everything expected in Booker (which used to rely on `getPublicEventSelect` trpc call)
        select: getPublicEventSelect(false),
      },
      isOrganization: true,
      organizationSettings: {
        select: {
          allowSEOIndexing: true,
        },
      },
    },
  });
  if (!team) return null;
  return team;
}

export const getCachedEventData = unstable_cache(
  async ({
    team,
    orgSlug,
    fromRedirectOfNonOrgLink,
  }: {
    team: TeamWithEventTypes;
    orgSlug: string | null;
    fromRedirectOfNonOrgLink: boolean;
  }) => {
    return await _getEventDataForTeamBooking({
      team,
      orgSlug,
      fromRedirectOfNonOrgLink,
    });
  },
  undefined,
  {
    revalidate: NEXTJS_CACHE_TTL,
  }
);

async function _getEventDataForTeamBooking({
  team,
  orgSlug,
  fromRedirectOfNonOrgLink,
}: {
  team: TeamWithEventTypes;
  orgSlug: string | null;
  fromRedirectOfNonOrgLink: boolean;
}) {
  if (!team?.eventTypes?.[0]) {
    return null;
  }

  const eventData = team.eventTypes[0];

  const { subsetOfHosts, hosts } = await getEventTypeHosts({
    hosts: eventData.hosts,
  });

  const enrichedOwner = eventData.owner
    ? await UserRepository.enrichUserWithItsProfile({
        user: eventData.owner,
      })
    : null;
  const users =
    (await getUsersFromEvent({ ...eventData, owner: enrichedOwner, subsetOfHosts, hosts }, prisma)) ?? [];
  const name = team.parent?.name ?? team.name ?? null;
  const isUnpublished = team.parent ? !team.parent.slug : !team.slug;

  const eventMetaData = eventTypeMetaDataSchemaWithTypedApps.parse(eventData.metadata);

  const eventDataShared = await processEventDataShared({
    eventData,
    metadata: eventMetaData,
    prisma,
  });

  return {
    ...eventDataShared,
    owner: enrichedOwner,
    subsetOfHosts,
    hosts,
    profile: getProfileFromEvent({ ...eventData, owner: enrichedOwner, subsetOfHosts, hosts }),
    subsetOfUsers: users,
    users,
    entity: {
      fromRedirectOfNonOrgLink,
      considerUnpublished: isUnpublished && !fromRedirectOfNonOrgLink,
      orgSlug,
      teamSlug: team.slug ?? null,
      name,
      hideProfileLink: false,
      logoUrl: team.parent
        ? getPlaceholderAvatar(team.parent.logoUrl, team.parent.name)
        : getPlaceholderAvatar(team.logoUrl, team.name),
    },
  };
}

export async function shouldUseApiV2ForTeamSlots(teamId: number): Promise<boolean> {
  const featureRepo = new FeaturesRepository();
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

  let teamMemberEmail = Array.isArray(crmContactOwnerEmail) ? crmContactOwnerEmail[0] : crmContactOwnerEmail;
  let crmOwnerRecordType = Array.isArray(crmContactOwnerRecordType)
    ? crmContactOwnerRecordType[0]
    : crmContactOwnerRecordType;
  let crmAppSlug = Array.isArray(crmAppSlugParam) ? crmAppSlugParam[0] : crmAppSlugParam;

  if (!teamMemberEmail || !crmOwnerRecordType || !crmAppSlug) {
    const { getTeamMemberEmailForResponseOrContactUsingUrlQuery } = await import(
      "@calcom/lib/server/getTeamMemberEmailFromCrm"
    );
    const {
      email,
      recordType,
      crmAppSlug: crmAppSlugQuery,
    } = await getTeamMemberEmailForResponseOrContactUsingUrlQuery({
      query,
      eventData,
    });

    teamMemberEmail = email ?? undefined;
    crmOwnerRecordType = recordType ?? undefined;
    crmAppSlug = crmAppSlugQuery ?? undefined;
  }

  return {
    teamMemberEmail,
    crmOwnerRecordType,
    crmAppSlug,
  };
}
