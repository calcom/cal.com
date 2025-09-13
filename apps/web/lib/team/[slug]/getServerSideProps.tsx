import type { GetServerSidePropsContext } from "next";

import { orgDomainConfig } from "@calcom/features/ee/organizations/lib/orgDomains";
import {
  getOrganizationSettings,
  getVerifiedDomain,
} from "@calcom/features/ee/organizations/lib/orgSettings";
import { FeaturesRepository } from "@calcom/features/flags/features.repository";
import { IS_CALCOM } from "@calcom/lib/constants";
import { getUserAvatarUrl } from "@calcom/lib/getAvatarUrl";
import { getBookerBaseUrlSync } from "@calcom/lib/getBookerUrl/client";
import logger from "@calcom/lib/logger";
import { markdownToSafeHTML } from "@calcom/lib/markdownToSafeHTML";
import { getTeamWithMembers } from "@calcom/lib/server/queries/teams";
import slugify from "@calcom/lib/slugify";
import { stripMarkdown } from "@calcom/lib/stripMarkdown";
import prisma from "@calcom/prisma";
import type { Team, OrganizationSettings } from "@calcom/prisma/client";
import { RedirectType } from "@calcom/prisma/client";
import { teamMetadataSchema } from "@calcom/prisma/zod-utils";

import { getTemporaryOrgRedirect } from "@lib/getTemporaryOrgRedirect";

const log = logger.getSubLogger({ prefix: ["team/[slug]"] });

function getOrgProfileRedirectToVerifiedDomain(
  team: {
    isOrganization: boolean;
  },
  settings: Pick<OrganizationSettings, "orgAutoAcceptEmail" | "orgProfileRedirectsToVerifiedDomain">
) {
  if (!team.isOrganization) {
    return null;
  }
  // when this is not on a Cal.com page we don't auto redirect -
  // good for diagnosis purposes.
  if (!IS_CALCOM) {
    return null;
  }

  const verifiedDomain = getVerifiedDomain(settings);

  if (!settings.orgProfileRedirectsToVerifiedDomain || !verifiedDomain) {
    return null;
  }

  return {
    redirect: {
      permanent: false,
      destination: `https://${verifiedDomain}`,
    },
  };
}

const getTheLastArrayElement = (value: ReadonlyArray<string> | string | undefined): string | undefined => {
  if (value === undefined || typeof value === "string") {
    return value;
  }

  return value.at(-1);
};

export const getServerSideProps = async (context: GetServerSidePropsContext) => {
  const slug = getTheLastArrayElement(context.query.slug) ?? getTheLastArrayElement(context.query.orgSlug);

  const { isValidOrgDomain, currentOrgDomain } = orgDomainConfig(
    context.req,
    context.params?.orgSlug ?? context.query?.orgSlug
  );
  const isOrgContext = isValidOrgDomain && currentOrgDomain;

  // Provided by Rewrite from next.config.js
  const isOrgProfile = context.query?.isOrgProfile === "1";
  const featuresRepository = new FeaturesRepository();
  const organizationsEnabled = await featuresRepository.checkIfFeatureIsEnabledGlobally("organizations");

  log.debug("getServerSideProps", {
    isOrgProfile,
    isOrganizationFeatureEnabled: organizationsEnabled,
    isValidOrgDomain,
    currentOrgDomain,
  });

  const team = await getTeamWithMembers({
    // It only finds those teams that have slug set. So, if only requestedSlug is set, it won't get that team
    slug: slugify(slug ?? ""),
    orgSlug: currentOrgDomain,
    isTeamView: true,
    isOrgView: isValidOrgDomain && isOrgProfile,
  });

  if (!isOrgContext && slug) {
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

  const metadata = teamMetadataSchema.parse(team?.metadata ?? {});

  // Taking care of sub-teams and orgs
  if (
    (!isValidOrgDomain && team?.parent) ||
    (!isValidOrgDomain && !!team?.isOrganization) ||
    !organizationsEnabled
  ) {
    return { notFound: true } as const;
  }

  if (!team) {
    // First check for unpublished regular team
    const unpublishedTeam = await prisma.team.findFirst({
      where: {
        metadata: {
          path: ["requestedSlug"],
          equals: slug,
        },
      },
      include: {
        parent: {
          select: {
            id: true,
            slug: true,
            name: true,
            isPrivate: true,
            isOrganization: true,
            metadata: true,
            logoUrl: true,
          },
        },
      },
    });

    if (unpublishedTeam) {
      const teamParent = unpublishedTeam.parent ? getTeamWithoutMetadata(unpublishedTeam.parent) : null;
      return {
        props: {
          considerUnpublished: true,
          team: {
            ...unpublishedTeam,
            parent: teamParent,
            createdAt: null,
          },
        },
      } as const;
    }

    // If no regular team found, check for CalIdTeam
    const calIdTeam = await prisma.calIdTeam.findFirst({
      where: {
        slug: slugify(slug),
      },
      include: {
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
          orderBy: {
            id: "asc",
          },
        },
      },
    });

    if (calIdTeam) {
      // Process CalIdTeam data to match Team structure
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
          },
          themeBasis: calIdTeam.slug,
          isValidOrgDomain: false,
          currentOrgDomain: null,
          isSEOIndexable: true,
        },
      } as const;
    }

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

  const organizationSettings = getOrganizationSettings(team);
  const allowSEOIndexing = organizationSettings?.allowSEOIndexing ?? false;

  const redirectToVerifiedDomain = organizationSettings
    ? getOrgProfileRedirectToVerifiedDomain(team, organizationSettings)
    : null;

  if (redirectToVerifiedDomain) {
    return redirectToVerifiedDomain;
  }

  const isTeamOrParentOrgPrivate = team.isPrivate || (team.parent?.isOrganization && team.parent?.isPrivate);

  team.eventTypes =
    team.eventTypes?.map((type) => ({
      ...type,
      users: !isTeamOrParentOrgPrivate
        ? type.users.map((user) => ({
            ...user,
            avatar: getUserAvatarUrl(user),
          }))
        : [],
      descriptionAsSafeHTML: markdownToSafeHTML(type.description),
    })) ?? null;

  const safeBio = markdownToSafeHTML(team.bio) || "";

  const members = !isTeamOrParentOrgPrivate
    ? team.members.map((member) => {
        return {
          name: member.name,
          id: member.id,
          avatarUrl: member.avatarUrl,
          bio: member.bio,
          profile: member.profile,
          subteams: member.subteams,
          username: member.username,
          accepted: member.accepted,
          organizationId: member.organizationId,
          safeBio: markdownToSafeHTML(member.bio || ""),
          bookerUrl: getBookerBaseUrlSync(member.organization?.slug || ""),
        };
      })
    : [];

  const markdownStrippedBio = stripMarkdown(team?.bio || "");

  const serializableTeam = getSerializableTeam(team);

  // For a team or Organization we check if it's unpublished
  // For a subteam, we check if the parent org is unpublished. A subteam can't be unpublished in itself
  const isUnpublished = team.parent ? !team.parent.slug : !team.slug;
  const isARedirectFromNonOrgLink = context.query.orgRedirection === "true";

  const considerUnpublished = isUnpublished && !isARedirectFromNonOrgLink;

  if (considerUnpublished) {
    return {
      props: {
        considerUnpublished: true,
        team: { ...serializableTeam },
      },
    } as const;
  }

  return {
    props: {
      team: {
        ...serializableTeam,
        safeBio,
        members,
        metadata,
        children: isTeamOrParentOrgPrivate ? [] : team.children,
      },
      themeBasis: serializableTeam.slug,
      markdownStrippedBio,
      isValidOrgDomain,
      currentOrgDomain,
      isSEOIndexable: allowSEOIndexing,
    },
  } as const;
};

/**
 * Removes sensitive data from team and ensures that the object is serialiable by Next.js
 */
function getSerializableTeam(team: NonNullable<Awaited<ReturnType<typeof getTeamWithMembers>>>) {
  const { inviteToken: _inviteToken, ...serializableTeam } = team;

  const teamParent = team.parent ? getTeamWithoutMetadata(team.parent) : null;

  return {
    ...serializableTeam,
    parent: teamParent,
  };
}

/**
 * Removes metadata from team and just adds requestedSlug
 */
function getTeamWithoutMetadata<T extends Pick<Team, "metadata">>(team: T) {
  const { metadata, ...rest } = team;
  const teamMetadata = teamMetadataSchema.parse(metadata);
  return {
    ...rest,
    // add requestedSlug if available.
    ...(typeof teamMetadata?.requestedSlug !== "undefined"
      ? { requestedSlug: teamMetadata?.requestedSlug }
      : {}),
  };
}
