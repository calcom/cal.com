import type { GetServerSidePropsContext } from "next";
import { z } from "zod";

import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import { getBookingForReschedule } from "@calcom/features/bookings/lib/get-booking";
import {
  orgDomainConfig,
  whereClauseForOrgWithSlugOrRequestedSlug,
} from "@calcom/features/ee/organizations/lib/orgDomains";
import { getOrganizationSEOSettings } from "@calcom/features/ee/organizations/lib/orgSettings";
import { FeaturesRepository } from "@calcom/features/flags/features.repository";
import { getPlaceholderAvatar } from "@calcom/lib/defaultAvatarImage";
import { shouldHideBrandingForTeamEvent } from "@calcom/lib/hideBranding";
import slugify from "@calcom/lib/slugify";
import prisma from "@calcom/prisma";
import type { User } from "@calcom/prisma/client";
import { BookingStatus, RedirectType } from "@calcom/prisma/client";
import { EventTypeMetaDataSchema } from "@calcom/prisma/zod-utils";

import { getTemporaryOrgRedirect } from "@lib/getTemporaryOrgRedirect";

const paramsSchema = z.object({
  type: z.string().transform((s) => slugify(s)),
  slug: z.string().transform((s) => slugify(s)),
});

function hasApiV2RouteInEnv() {
  return Boolean(process.env.NEXT_PUBLIC_API_V2_URL);
}

export const getServerSideProps = async (context: GetServerSidePropsContext) => {
  const { req, params, query } = context;
  const session = await getServerSession({ req });
  const { slug: teamSlug, type: meetingSlug } = paramsSchema.parse(params);
  const { rescheduleUid, isInstantMeeting: queryIsInstantMeeting } = query;
  const allowRescheduleForCancelledBooking = query.allowRescheduleForCancelledBooking === "true";
  const { currentOrgDomain, isValidOrgDomain } = orgDomainConfig(req, params?.orgSlug);
  const isOrgContext = currentOrgDomain && isValidOrgDomain;

  if (!isOrgContext) {
    const redirect = await getTemporaryOrgRedirect({
      slugs: teamSlug,
      redirectType: RedirectType.Team,
      eventTypeSlug: meetingSlug,
      currentQuery: context.query,
      prismaClient: prisma,
    });

    if (redirect) {
      return redirect;
    }
  }

  const [orgId, booking] = await Promise.all([
    isOrgContext ? getOrgId(currentOrgDomain) : Promise.resolve(null),
    rescheduleUid ? getBookingForReschedule(`${rescheduleUid}`, session?.user?.id) : Promise.resolve(null),
  ]);

  const team = await getTeamData(teamSlug, orgId);

  if (!team) {
    return { notFound: true } as const;
  }

  const eventData = await getEventTypeData(meetingSlug, team.id);

  if (!eventData) {
    return { notFound: true } as const;
  }

  if (rescheduleUid && eventData.disableRescheduling) {
    return { redirect: { destination: `/booking/${rescheduleUid}`, permanent: false } };
  }

  if (
    booking?.status === BookingStatus.CANCELLED &&
    !allowRescheduleForCancelledBooking &&
    !eventData.allowReschedulingCancelledBookings
  ) {
    return {
      redirect: {
        permanent: false,
        destination: `/team/${teamSlug}/${meetingSlug}`,
      },
    };
  }

  const eventTypeId = eventData.id;
  const orgSlug = isValidOrgDomain ? currentOrgDomain : null;
  const name = team.parent?.name ?? team.name ?? null;

  const eventHostsUserData = getEventHosts(
    team.isPrivate,
    eventData.hosts.map((h) => h.user),
    eventData.users ?? []
  );

  const fromRedirectOfNonOrgLink = context.query.orgRedirection === "true";
  const isUnpublished = team.parent ? !team.parent.slug : !team.slug;

  const crmContactOwnerEmail = query["cal.crmContactOwnerEmail"];
  const crmContactOwnerRecordType = query["cal.crmContactOwnerRecordType"];
  const crmAppSlugParam = query["cal.crmAppSlug"];

  // Handle string[] type from query params
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

  const organizationSettings = getOrganizationSEOSettings(team);
  const allowSEOIndexing = organizationSettings?.allowSEOIndexing ?? false;
  const featureRepo = new FeaturesRepository();
  const teamHasApiV2Route = await featureRepo.checkIfTeamHasFeature(team.id, "use-api-v2-for-team-slots");
  const useApiV2 = teamHasApiV2Route && hasApiV2RouteInEnv();

  return {
    props: {
      useApiV2,
      eventData: {
        eventTypeId,
        entity: {
          fromRedirectOfNonOrgLink,
          considerUnpublished: isUnpublished && !fromRedirectOfNonOrgLink,
          orgSlug,
          teamSlug: team.slug ?? null,
          name,
        },
        length: eventData.length,
        metadata: EventTypeMetaDataSchema.parse(eventData.metadata),
        profile: {
          image: team.parent
            ? getPlaceholderAvatar(team.parent.logoUrl, team.parent.name)
            : getPlaceholderAvatar(team.logoUrl, team.name),
          name,
          username: orgSlug ?? null,
        },
        title: eventData.title,
        users: eventHostsUserData,
        hidden: eventData.hidden,
        interfaceLanguage: eventData.interfaceLanguage,
      },
      booking,
      user: teamSlug,
      teamId: team.id,
      slug: meetingSlug,
      isBrandingHidden: shouldHideBrandingForTeamEvent({
        eventTypeId: eventData.id,
        team,
      }),
      isInstantMeeting: eventData && queryIsInstantMeeting ? true : false,
      themeBasis: null,
      orgBannerUrl: team.parent?.bannerUrl ?? "",
      teamMemberEmail,
      crmOwnerRecordType,
      crmAppSlug,
      isSEOIndexable: allowSEOIndexing,
    },
  };
};

const getOrgId = async (orgSlug: string): Promise<number | null> => {
  const org = await prisma.team.findFirst({
    where: whereClauseForOrgWithSlugOrRequestedSlug(orgSlug),
    select: { id: true },
  });

  return org?.id ?? null;
};

const getTeamData = async (teamSlug: string, orgId: number | null) => {
  const teamSelectFields = {
    id: true,
    isPrivate: true,
    hideBranding: true,
    logoUrl: true,
    name: true,
    slug: true,
    isOrganization: true,
    parent: {
      select: {
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
    organizationSettings: {
      select: {
        allowSEOIndexing: true,
      },
    },
  };

  if (orgId !== null) {
    const publishedTeam = await prisma.team.findUnique({
      where: {
        slug_parentId: {
          slug: teamSlug,
          parentId: orgId,
        },
        isOrganization: false,
      },
      select: teamSelectFields,
    });
    if (publishedTeam) return publishedTeam;
  }

  return await prisma.team.findFirst({
    where: {
      parentId: orgId ?? null,
      isOrganization: false,
      OR: [
        { slug: teamSlug },
        {
          metadata: {
            path: ["requestedSlug"],
            equals: teamSlug,
          },
        },
      ],
    },
    select: teamSelectFields,
    orderBy: {
      slug: { sort: "asc", nulls: "last" },
    },
  });
};

const getEventTypeData = async (meetingSlug: string, teamId: number) => {
  return await prisma.eventType.findUnique({
    where: {
      // Use the EventType_teamId_slug_key unique index
      teamId_slug: {
        teamId: teamId,
        slug: meetingSlug,
      },
    },
    select: {
      id: true,
      title: true,
      isInstantEvent: true,
      schedulingType: true,
      metadata: true,
      length: true,
      hidden: true,
      disableCancelling: true,
      disableRescheduling: true,
      allowReschedulingCancelledBookings: true,
      interfaceLanguage: true,
      hosts: {
        take: 3,
        select: {
          user: {
            select: {
              name: true,
              username: true,
            },
          },
        },
      },
      // Include users for when hosts is empty
      users: {
        take: 1,
        select: {
          username: true,
          name: true,
        },
      },
    },
  });
};

const getEventHosts = (
  isPrivateTeam: boolean,
  hosts: Pick<User, "username" | "name">[],
  users: Pick<User, "username" | "name">[]
) => {
  if (isPrivateTeam) {
    return [];
  }

  if (hosts.length > 0) {
    return hosts
      .filter((user) => user.username)
      .map((user) => ({
        username: user.username ?? "",
        name: user.name ?? "",
      }));
  }

  if (users.length > 0) {
    return [
      {
        username: users[0].username ?? "",
        name: users[0].name ?? "",
      },
    ];
  }

  return [];
};
