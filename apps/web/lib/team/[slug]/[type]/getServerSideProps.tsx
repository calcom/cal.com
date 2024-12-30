import type { GetServerSidePropsContext } from "next";
import { z } from "zod";

import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import type { GetBookingType } from "@calcom/features/bookings/lib/get-booking";
import { getBookingForReschedule } from "@calcom/features/bookings/lib/get-booking";
import { getSlugOrRequestedSlug, orgDomainConfig } from "@calcom/features/ee/organizations/lib/orgDomains";
import { getPlaceholderAvatar } from "@calcom/lib/defaultAvatarImage";
import { OrganizationRepository } from "@calcom/lib/server/repository/organization";
import slugify from "@calcom/lib/slugify";
import prisma from "@calcom/prisma";
import { RedirectType } from "@calcom/prisma/client";
import { EventTypeMetaDataSchema } from "@calcom/prisma/zod-utils";

import { getTemporaryOrgRedirect } from "@lib/getTemporaryOrgRedirect";

import { ssrInit } from "@server/lib/ssr";

const paramsSchema = z.object({
  type: z.string().transform((s) => slugify(s)),
  slug: z.string().transform((s) => slugify(s)),
});

// Booker page fetches a tiny bit of data server side:
// 1. Check if team exists, to show 404
// 2. If rescheduling, get the booking details
export const getServerSideProps = async (context: GetServerSidePropsContext) => {
  const { req, params, query } = context;
  const session = await getServerSession({ req });
  const { slug: teamSlug, type: meetingSlug } = paramsSchema.parse(params);
  const { rescheduleUid, isInstantMeeting: queryIsInstantMeeting, email } = query;
  const { currentOrgDomain, isValidOrgDomain } = orgDomainConfig(req, params?.orgSlug);
  const isOrgContext = currentOrgDomain && isValidOrgDomain;

  if (!isOrgContext) {
    const redirect = await getTemporaryOrgRedirect({
      slugs: teamSlug,
      redirectType: RedirectType.Team,
      eventTypeSlug: meetingSlug,
      currentQuery: context.query,
    });

    if (redirect) {
      return redirect;
    }
  }

  const team = await prisma.team.findFirst({
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

  if (!team || !team.eventTypes?.[0]) {
    return {
      notFound: true,
    } as const;
  }
  const eventData = team.eventTypes[0];
  const eventTypeId = eventData.id;

  // INFO: This code was pulled from getPublicEvent and used here.
  // Calling the tRPC fetch to get the public event data is incredibly slow
  // for large teams and we don't want to add it back. Future refactors will happen
  // to speed up this call.
  let users: { username: string; name: string }[] = [];

  if (!team.isPrivate && eventData.hosts.length > 0) {
    users = eventData.hosts
      .filter((host) => host.user.username)
      .map((host) => ({
        username: host.user.username ?? "",
        name: host.user.name ?? "",
      }));
  }
  if (!team.isPrivate && eventData.hosts.length === 0) {
    // a minimalistic version of `getOwnerFromUsersArray` in `getPublicEvent.ts`
    // backward compatibility logic for team event types that have users[] but not hosts[]
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

    if (data.length > 0) {
      users = [
        {
          username: data[0].username ?? "",
          name: data[0].name ?? "",
        },
      ];
    }
  }

  const orgSlug = isValidOrgDomain ? currentOrgDomain : null;
  const name = team.parent?.name ?? team.name ?? null;

  let booking: GetBookingType | null = null;
  if (rescheduleUid) {
    booking = await getBookingForReschedule(`${rescheduleUid}`, session?.user?.id);
  }

  const ssr = await ssrInit(context);
  const fromRedirectOfNonOrgLink = context.query.orgRedirection === "true";
  const isUnpublished = team.parent ? !team.parent.slug : !team.slug;
  const { getTeamMemberEmailForResponseOrContactUsingUrlQuery } = await import(
    "@calcom/web/lib/getTeamMemberEmailFromCrm"
  );
  const {
    email: teamMemberEmail,
    recordType: crmOwnerRecordType,
    crmAppSlug,
  } = await getTeamMemberEmailForResponseOrContactUsingUrlQuery({
    query,
    eventData,
  });

  const organizationSettings = OrganizationRepository.utils.getOrganizationSEOSettings(team);
  const allowSEOIndexing = organizationSettings?.allowSEOIndexing ?? false;

  if (!eventData) {
    return {
      notFound: true,
    } as const;
  }

  return {
    props: {
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
        users,
        hidden: eventData.hidden,
      },
      booking,
      user: teamSlug,
      teamId: team.id,
      slug: meetingSlug,
      trpcState: ssr.dehydrate(),
      isBrandingHidden: team?.hideBranding,
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
