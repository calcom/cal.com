import type { GetServerSidePropsContext } from "next";
import { z } from "zod";

import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import { getBookingForReschedule } from "@calcom/features/bookings/lib/get-booking";
import logger from "@calcom/lib/logger";
import { getSlugOrRequestedSlug, orgDomainConfig } from "@calcom/features/ee/organizations/lib/orgDomains";
import { getOrganizationSEOSettings } from "@calcom/features/ee/organizations/lib/orgSettings";
import { FeaturesRepository } from "@calcom/features/flags/features.repository";
import { getBrandingForEventType } from "@calcom/features/profile/lib/getBranding";
import { shouldHideBrandingForTeamEvent } from "@calcom/features/profile/lib/hideBranding";
import { getPlaceholderAvatar } from "@calcom/lib/defaultAvatarImage";
import slugify from "@calcom/lib/slugify";
import { prisma } from "@calcom/prisma";
import type { User } from "@calcom/prisma/client";
import { BookingStatus, RedirectType, SchedulingType } from "@calcom/prisma/enums";
import { EventTypeMetaDataSchema } from "@calcom/prisma/zod-utils";

import { handleOrgRedirect } from "@lib/handleOrgRedirect";

const paramsSchema = z.object({
  type: z.string().transform((s) => slugify(s)),
  slug: z.string().transform((s) => slugify(s)),
});

function hasApiV2RouteInEnv() {
  return Boolean(process.env.NEXT_PUBLIC_API_V2_URL);
}

export const getServerSideProps = async (context: GetServerSidePropsContext) => {
  const { req, params, query } = context;
  const { slug: teamSlug, type: meetingSlug } = paramsSchema.parse(params);
  const { rescheduleUid, bookingUid, isInstantMeeting: queryIsInstantMeeting } = query;
  const allowRescheduleForCancelledBooking = query.allowRescheduleForCancelledBooking === "true";
  const { currentOrgDomain, isValidOrgDomain } = orgDomainConfig(req, params?.orgSlug);

  const redirect = await handleOrgRedirect({
    slugs: [teamSlug],
    redirectType: RedirectType.Team,
    eventTypeSlug: meetingSlug,
    context,
    currentOrgDomain: isValidOrgDomain ? currentOrgDomain : null,
  });

  if (redirect) {
    return redirect;
  }

  const team = await getTeamWithEventsData(teamSlug, meetingSlug, isValidOrgDomain, currentOrgDomain);

  if (!team || !team.eventTypes?.[0]) {
    return { notFound: true } as const;
  }

  const eventData = team.eventTypes[0];

  if (eventData.schedulingType === SchedulingType.MANAGED) {
    return { notFound: true } as const;
  }

  // Redirect if no routing form response and redirect URL is configured
  // Don't redirect if this is a reschedule flow or seated booking flow
  const hasRoutingFormResponse = query["cal.routingFormResponseId"] || query["cal.queuedFormResponseId"];
  if (
    !hasRoutingFormResponse &&
    !rescheduleUid &&
    !bookingUid &&
    eventData.redirectUrlOnNoRoutingFormResponse
  ) {
    return {
      redirect: {
        destination: eventData.redirectUrlOnNoRoutingFormResponse,
        permanent: false,
      },
    };
  }

  if (rescheduleUid && eventData.disableRescheduling) {
    return { redirect: { destination: `/booking/${rescheduleUid}`, permanent: false } };
  }

  const eventTypeId = eventData.id;
  const orgSlug = isValidOrgDomain ? currentOrgDomain : null;
  const name = team.parent?.name ?? team.name ?? null;
  const fromRedirectOfNonOrgLink = context.query.orgRedirection === "true";
  const isUnpublished = team.parent ? !team.parent.slug : !team.slug;

  const crmContactOwnerEmail = query["cal.crmContactOwnerEmail"];
  const crmContactOwnerRecordType = query["cal.crmContactOwnerRecordType"];
  const crmAppSlugParam = query["cal.crmAppSlug"];
  const crmRecordIdParam = query["cal.crmRecordId"];
  const crmLookupDoneParam = query["cal.crmLookupDone"];

  const crmContactOwnerEmailStr = Array.isArray(crmContactOwnerEmail)
    ? crmContactOwnerEmail[0]
    : crmContactOwnerEmail;
  const crmOwnerRecordTypeStr = Array.isArray(crmContactOwnerRecordType)
    ? crmContactOwnerRecordType[0]
    : crmContactOwnerRecordType;
  const crmAppSlugStr = Array.isArray(crmAppSlugParam) ? crmAppSlugParam[0] : crmAppSlugParam;
  const crmRecordIdStr = Array.isArray(crmRecordIdParam) ? crmRecordIdParam[0] : crmRecordIdParam;

  // If crmLookupDone is true, the router already performed the CRM lookup, so skip it here
  const crmLookupDone =
    (Array.isArray(crmLookupDoneParam) ? crmLookupDoneParam[0] : crmLookupDoneParam) === "true";

  const needsCrmLookup =
    !crmLookupDone && (!crmContactOwnerEmailStr || !crmOwnerRecordTypeStr || !crmAppSlugStr);

  // Run independent queries in parallel — these all depend on team/eventData but not on each other
  const log = logger.getSubLogger({ prefix: ["team-event-ssr", `${teamSlug}/${meetingSlug}`] });
  const featureRepo = new FeaturesRepository(prisma);
  const [eventHostsUserData, crmResult, teamHasApiV2Route, booking] = await Promise.all([
    getUsersData(
      team.isPrivate,
      eventTypeId,
      eventData.hosts.map((h) => h.user)
    ).catch((err) => {
      log.error("Failed to get users data", err);
      throw err;
    }),
    needsCrmLookup
      ? import("@calcom/features/ee/teams/lib/getTeamMemberEmailFromCrm")
          .then(({ getTeamMemberEmailForResponseOrContactUsingUrlQuery }) =>
            getTeamMemberEmailForResponseOrContactUsingUrlQuery({ query, eventData })
          )
          .catch((err) => {
            log.error("Failed CRM lookup", err);
            throw err;
          })
      : Promise.resolve(null),
    featureRepo.checkIfTeamHasFeature(team.id, "use-api-v2-for-team-slots").catch((err) => {
      log.error("Failed to check API V2 feature flag", err);
      throw err;
    }),
    rescheduleUid
      ? getServerSession({ req })
          .then((session) => getBookingForReschedule(`${rescheduleUid}`, session?.user?.id))
          .catch((err) => {
            log.error("Failed to get booking for reschedule", err);
            throw err;
          })
      : Promise.resolve(null),
  ]);

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

  const teamMemberEmail = crmResult?.email ?? crmContactOwnerEmailStr;
  const crmOwnerRecordType = crmResult?.recordType ?? crmOwnerRecordTypeStr;
  const crmAppSlug = crmResult?.crmAppSlug ?? crmAppSlugStr;
  const crmRecordId = crmResult?.recordId ?? crmRecordIdStr;

  const organizationSettings = getOrganizationSEOSettings(team);
  const allowSEOIndexing = organizationSettings?.allowSEOIndexing ?? false;

  const useApiV2 = teamHasApiV2Route && hasApiV2RouteInEnv();

  const branding = getBrandingForEventType({
    eventType: {
      team: team.parent ?? team,
      users: [],
      profile: null,
    },
  });

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
          ...branding,
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
      crmRecordId,
      isSEOIndexable: allowSEOIndexing,
    },
  };
};

const getTeamWithEventsData = async (
  teamSlug: string,
  meetingSlug: string,
  isValidOrgDomain: boolean,
  currentOrgDomain: string | null
) => {
  return await prisma.team.findFirst({
    where: {
      ...getSlugOrRequestedSlug(teamSlug),
      parent: isValidOrgDomain && currentOrgDomain ? getSlugOrRequestedSlug(currentOrgDomain) : null,
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
          slug: true,
          name: true,
          bannerUrl: true,
          logoUrl: true,
          hideBranding: true,
          brandColor: true,
          darkBrandColor: true,
          theme: true,
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
          slug: meetingSlug,
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
          redirectUrlOnNoRoutingFormResponse: true,
          interfaceLanguage: true,
          hosts: {
            take: 3,
            select: {
              user: {
                select: {
                  name: true,
                  username: true,
                  email: true,
                },
              },
            },
          },
        },
      },
      isOrganization: true,
      organizationSettings: {
        select: {
          allowSEOIndexing: true,
        },
      },
    },
  });
};

const getUsersData = async (
  isPrivateTeam: boolean,
  eventTypeId: number,
  users: Pick<User, "username" | "name">[]
) => {
  if (!isPrivateTeam && users.length > 0) {
    return users
      .filter((user) => user.username)
      .map((user) => ({
        username: user.username ?? "",
        name: user.name ?? "",
      }));
  }
  if (!isPrivateTeam && users.length === 0) {
    const { users: data } = await prisma.eventType.findUniqueOrThrow({
      where: { id: eventTypeId },
      select: {
        users: {
          take: 1,
          select: {
            username: true,
            name: true,
          },
        },
      },
    });

    return data.length > 0
      ? [
          {
            username: data[0].username ?? "",
            name: data[0].name ?? "",
          },
        ]
      : [];
  }

  return [];
};
