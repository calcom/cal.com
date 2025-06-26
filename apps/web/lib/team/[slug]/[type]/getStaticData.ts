import type { GetServerSidePropsContext } from "next";
import { z } from "zod";

import { getSlugOrRequestedSlug, orgDomainConfig } from "@calcom/features/ee/organizations/lib/orgDomains";
import { getOrganizationSEOSettings } from "@calcom/features/ee/organizations/lib/orgSettings";
import { getPlaceholderAvatar } from "@calcom/lib/defaultAvatarImage";
import { shouldHideBrandingForTeamEvent } from "@calcom/lib/hideBranding";
import slugify from "@calcom/lib/slugify";
import prisma from "@calcom/prisma";
import { EventTypeMetaDataSchema } from "@calcom/prisma/zod-utils";

import { getTemporaryOrgRedirect } from "@lib/getTemporaryOrgRedirect";

const paramsSchema = z.object({
  type: z.string().transform((s) => slugify(s)),
  slug: z.string().transform((s) => slugify(s)),
});

export const getStaticTeamEventData = async (context: GetServerSidePropsContext) => {
  const { req, params, query } = context;
  const { slug: teamSlug, type: meetingSlug } = paramsSchema.parse(params);
  const { currentOrgDomain, isValidOrgDomain } = orgDomainConfig(req, params?.orgSlug);
  const isOrgContext = currentOrgDomain && isValidOrgDomain;

  if (!isOrgContext) {
    const redirect = await getTemporaryOrgRedirect({
      slugs: teamSlug,
      redirectType: "Team" as any,
      eventTypeSlug: meetingSlug,
      currentQuery: context.query,
    });

    if (redirect) {
      return null;
    }
  }

  const team = await getTeamWithEventsData(teamSlug, meetingSlug, isValidOrgDomain, currentOrgDomain);

  if (!team || !team.eventTypes?.[0]) {
    return null;
  }

  const eventData = team.eventTypes[0];
  const eventTypeId = eventData.id;
  const orgSlug = isValidOrgDomain ? currentOrgDomain : null;
  const name = team.parent?.name ?? team.name ?? null;

  const organizationSettings = getOrganizationSEOSettings(team);
  const allowSEOIndexing = organizationSettings?.allowSEOIndexing ?? false;

  return {
    eventData: {
      eventTypeId,
      entity: {
        fromRedirectOfNonOrgLink: false,
        considerUnpublished: false,
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
      users: [],
      hidden: eventData.hidden,
      interfaceLanguage: eventData.interfaceLanguage,
      slug: eventData.slug,
      team: {
        id: team.id,
        name: team.name,
        slug: team.slug,
      },
    },
    user: teamSlug,
    teamId: team.id,
    slug: meetingSlug,
    isBrandingHidden: shouldHideBrandingForTeamEvent({
      eventTypeId: eventData.id,
      team,
    }),
    orgBannerUrl: team.parent?.bannerUrl ?? "",
    isSEOIndexable: allowSEOIndexing,
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
          slug: true,
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
