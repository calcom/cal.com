import type { GetServerSidePropsContext } from "next";

import { DEFAULT_LIGHT_BRAND_COLOR, DEFAULT_DARK_BRAND_COLOR } from "@calcom/lib/constants";
import { getUserAvatarUrl } from "@calcom/lib/getAvatarUrl";
import { getBookerBaseUrlSync } from "@calcom/lib/getBookerUrl/client";
import logger from "@calcom/lib/logger";
import { markdownToSafeHTML } from "@calcom/lib/markdownToSafeHTML";
import slugify from "@calcom/lib/slugify";
import { stripMarkdown } from "@calcom/lib/stripMarkdown";
import prisma from "@calcom/prisma";
import { RedirectType } from "@calcom/prisma/client";

import { getTemporaryOrgRedirect } from "@lib/getTemporaryOrgRedirect";

const log = logger.getSubLogger({ prefix: ["team/[slug]"] });

const getTheLastArrayElement = (value: ReadonlyArray<string> | string | undefined): string | undefined => {
  if (value === undefined || typeof value === "string") {
    return value;
  }

  return value.at(-1);
};

export const getCalIdServerSideProps = async (context: GetServerSidePropsContext) => {
  const slug = getTheLastArrayElement(context.query.slug) ?? getTheLastArrayElement(context.query.orgSlug);

  log.debug("getCalIdServerSideProps", {
    slug,
  });

  // Check for CalIdTeam first
  const calIdTeam = await prisma.calIdTeam.findFirst({
    where: {
      slug: slugify(slug ?? ""),
    },
    select: {
      id: true,
      name: true,
      slug: true,
      bio: true,
      logoUrl: true,
      bannerUrl: true,
      theme: true,
      brandColor: true,
      darkBrandColor: true,
      isTeamPrivate: true,
      hideTeamBranding: true,
      hideTeamProfileLink: true,
      hideBookATeamMember: true,
      metadata: true,
      members: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              username: true,
              email: true,
              avatarUrl: true,
              bio: true,
              timeZone: true,
              profiles: {
                select: {
                  id: true,
                  username: true,
                  organizationId: true,
                  organization: {
                    select: {
                      id: true,
                      slug: true,
                      name: true,
                    },
                  },
                },
              },
            },
          },
        },
      },
      eventTypes: {
        where: {
          hidden: false,
        },
        include: {
          hosts: {
            take: 3,
            select: {
              user: {
                select: {
                  name: true,
                  username: true,
                  email: true,
                  avatarUrl: true,
                },
              },
            },
          },
        },
        orderBy: [{ position: "desc" }, { id: "asc" }],
      },
    },
  });

  if (!calIdTeam) {
    // Check for unpublished CalIdTeam
    const unpublishedCalIdTeam = await prisma.calIdTeam.findFirst({
      where: {
        metadata: {
          path: ["requestedSlug"],
          equals: slug,
        },
      },
    });

    if (unpublishedCalIdTeam) {
      return {
        props: {
          considerUnpublished: true,
          team: {
            ...unpublishedCalIdTeam,
            isPrivate: unpublishedCalIdTeam.isTeamPrivate,
            hideBranding: unpublishedCalIdTeam.hideTeamBranding,
            hideTeamProfileLink: unpublishedCalIdTeam.hideTeamProfileLink,
            hideBookATeamMember: unpublishedCalIdTeam.hideBookATeamMember,
            logoUrl: unpublishedCalIdTeam.logoUrl,
            theme: unpublishedCalIdTeam.theme,
            brandColor: unpublishedCalIdTeam.brandColor ?? DEFAULT_LIGHT_BRAND_COLOR,
            darkBrandColor: unpublishedCalIdTeam.darkBrandColor ?? DEFAULT_DARK_BRAND_COLOR,
            members: [],
            eventTypes: [],
            isOrganization: false,
            parent: null,
            children: [],
            membership: {
              role: "OWNER",
            },
          },
          isValidOrgDomain: false,
          currentOrgDomain: null,
        },
      } as const;
    }

    return { notFound: true } as const;
  }

  // Check for temporary redirects
  if (slug) {
    const redirect = await getTemporaryOrgRedirect({
      slugs: slug,
      redirectType: RedirectType.Team,
      eventTypeSlug: null,
      currentQuery: context.query,
    });

    if (redirect) {
      return redirect;
    }
  }

  const processedEventTypes = calIdTeam.eventTypes.map((type) => ({
    ...type,
    users: !calIdTeam.isTeamPrivate
      ? type.hosts.map((host) => ({
          ...host.user,
          avatar: getUserAvatarUrl(host.user),
        }))
      : [],
    descriptionAsSafeHTML: markdownToSafeHTML(type.description || ""),
  }));

  if (
    processedEventTypes.length === 1 &&
    processedEventTypes[0].schedulingType === "MANAGED" &&
    /*search params doesn't have members*/ !context.query.members
  ) {
    // If the team has only one event type and it's managed, redirect to the event type page
    return {
      redirect: {
        destination: `/team/${calIdTeam.slug}?members=1`,
        permanent: false,
      },
    } as const;
  }

  const processedMembers = !calIdTeam.isTeamPrivate
    ? calIdTeam.members.map((member) => {
        const profile = member.user.profiles?.[0];
        return {
          id: member.user.id,
          name: member.user.name,
          username: profile?.username ?? member.user.username,
          email: member.user.email,
          avatarUrl: member.user.avatarUrl,
          bio: member.user.bio,
          timeZone: member.user.timeZone,
          role: member.role,
          accepted: member.acceptedInvitation,
          organizationId: profile?.organizationId ?? null,
          organization: profile?.organization,
          bookerUrl: getBookerBaseUrlSync(profile?.organization?.slug || ""),
          safeBio: markdownToSafeHTML(member.user.bio || ""),
          profile: profile,
          subteams: [], // Add empty subteams array for compatibility
        };
      })
    : [];

  const safeBio = markdownToSafeHTML(calIdTeam.bio || "");
  const markdownStrippedBio = stripMarkdown(calIdTeam.bio || "");

  return {
    props: {
      team: {
        ...calIdTeam,
        // Map CalIdTeam fields to Team fields for compatibility
        isPrivate: calIdTeam.isTeamPrivate,
        hideBranding: calIdTeam.hideTeamBranding,
        hideTeamProfileLink: calIdTeam.hideTeamProfileLink,
        hideBookATeamMember: calIdTeam.hideBookATeamMember,
        logoUrl: calIdTeam.logoUrl,
        theme: calIdTeam.theme,
        brandColor: calIdTeam.brandColor ?? DEFAULT_LIGHT_BRAND_COLOR,
        darkBrandColor: calIdTeam.darkBrandColor ?? DEFAULT_DARK_BRAND_COLOR,
        members: processedMembers,
        eventTypes: processedEventTypes,
        safeBio,
        markdownStrippedBio,
        // Add missing fields that Team component expects
        isOrganization: false,
        parent: null,
        children: [],
        membership: {
          role: "OWNER",
        },
        // Add additional fields for compatibility
        requestedSlug: null,
      },
      themeBasis: calIdTeam.slug,
      isValidOrgDomain: false,
      currentOrgDomain: null,
      isSEOIndexable: true,
    },
  } as const;
};
