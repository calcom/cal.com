import type { GetServerSidePropsContext } from "next";

import { getBookerBaseUrlSync } from "@calcom/features/ee/organizations/lib/getBookerBaseUrlSync";
import { orgDomainConfig } from "@calcom/features/ee/organizations/lib/orgDomains";
import {
  getOrganizationSettings,
  getVerifiedDomain,
} from "@calcom/features/ee/organizations/lib/orgSettings";
import { getTeamWithMembers } from "@calcom/features/ee/teams/lib/queries";
import { FeaturesRepository } from "@calcom/features/flags/features.repository";
import { IS_CALCOM } from "@calcom/lib/constants";
import { getUserAvatarUrl } from "@calcom/lib/getAvatarUrl";
import logger from "@calcom/lib/logger";
import { markdownToSafeHTML } from "@calcom/lib/markdownToSafeHTML";
import slugify from "@calcom/lib/slugify";
import { stripMarkdown } from "@calcom/lib/stripMarkdown";
import prisma from "@calcom/prisma";
import type { Team, OrganizationSettings } from "@calcom/prisma/client";
import { RedirectType } from "@calcom/prisma/enums";
import { teamMetadataSchema } from "@calcom/prisma/zod-utils";

import { handleOrgRedirect } from "@lib/handleOrgRedirect";

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

  // Provided by Rewrite from next.config.js
  const isOrgProfile = context.query?.isOrgProfile === "1";
  const featuresRepository = new FeaturesRepository(prisma);
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

  if (slug) {
    const redirect = await handleOrgRedirect({
      slugs: [slug],
      redirectType: RedirectType.Team,
      eventTypeSlug: null,
      context,
      currentOrgDomain: isValidOrgDomain ? currentOrgDomain : null,
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
    // Because we are fetching by requestedSlug being set, it can either be an organization or a regular team. But it can't be a sub-team i.e.
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

    if (!unpublishedTeam) return { notFound: true } as const;
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

  const organizationSettings = getOrganizationSettings(team);
  const allowSEOIndexing = organizationSettings?.allowSEOIndexing ?? false;

  const redirectToVerifiedDomain = organizationSettings
    ? getOrgProfileRedirectToVerifiedDomain(team, organizationSettings)
    : null;

  if (redirectToVerifiedDomain) {
    return redirectToVerifiedDomain;
  }

  const isTeamOrParentOrgPrivate = team.isPrivate || (team.parent?.isOrganization && team.parent?.isPrivate);

  const minimalEventTypes =
    team.eventTypes?.map((type) => ({
      // Fields from baseEventTypeSelect (except description which becomes descriptionAsSafeHTML)
      id: type.id,
      title: type.title,
      slug: type.slug,
      length: type.length,
      schedulingType: type.schedulingType,
      recurringEvent: type.recurringEvent,
      hidden: type.hidden,
      price: type.price,
      currency: type.currency,
      lockTimeZoneToggleOnBookingPage: type.lockTimeZoneToggleOnBookingPage,
      lockedTimeZone: type.lockedTimeZone,
      requiresConfirmation: type.requiresConfirmation,
      requiresBookerEmailVerification: type.requiresBookerEmailVerification,
      canSendCalVideoTranscriptionEmails: type.canSendCalVideoTranscriptionEmails,
      seatsPerTimeSlot: type.seatsPerTimeSlot,
      // Additional fields needed by EventTypeDescription
      metadata: type.metadata,
      descriptionAsSafeHTML: markdownToSafeHTML(type.description),
      users: !isTeamOrParentOrgPrivate
        ? type.users.map((user) => ({
            name: user.name,
            username: user.username,
            avatarUrl: user.avatarUrl,
            avatar: getUserAvatarUrl(user),
            profile: {
              id: user.profile.id,
              upId: user.profile.upId,
              username: user.profile.username,
              organizationId: user.profile.organizationId,
              organization: user.profile.organization
                ? {
                    id: user.profile.organization.id,
                    slug: user.profile.organization.slug,
                    name: user.profile.organization.name,
                    requestedSlug: user.profile.organization.requestedSlug,
                    calVideoLogo: user.profile.organization.calVideoLogo,
                    bannerUrl: user.profile.organization.bannerUrl,
                  }
                : null,
            },
          }))
        : [],
    })) ?? null;

  const safeBio = markdownToSafeHTML(team.bio) || "";

  const minimalMembers = !isTeamOrParentOrgPrivate
    ? team.members.map((member) => ({
        id: member.id,
        name: member.name,
        username: member.username,
        avatarUrl: member.avatarUrl,
        bio: member.bio,
        organizationId: member.organizationId,
        subteams: member.subteams,
        accepted: member.accepted,
        profile: {
          id: member.profile.id,
          username: member.profile.username,
          organizationId: member.profile.organizationId,
          organization: member.profile.organization
            ? {
                id: member.profile.organization.id,
                slug: member.profile.organization.slug,
                name: member.profile.organization.name,
                requestedSlug: member.profile.organization.requestedSlug,
                calVideoLogo: member.profile.organization.calVideoLogo,
                bannerUrl: member.profile.organization.bannerUrl,
              }
            : null,
        },
        safeBio: markdownToSafeHTML(member.bio || ""),
        bookerUrl: getBookerBaseUrlSync(member.organization?.slug || ""),
      }))
    : [];

  const markdownStrippedBio = stripMarkdown(team?.bio || "");

  const minimalParent = team.parent
    ? {
        id: team.parent.id,
        slug: team.parent.slug,
        name: team.parent.name,
        isOrganization: team.parent.isOrganization,
        isPrivate: team.parent.isPrivate,
        logoUrl: team.parent.logoUrl,
        requestedSlug: teamMetadataSchema.parse(team.parent.metadata)?.requestedSlug ?? null,
      }
    : null;

  const minimalChildren = isTeamOrParentOrgPrivate
    ? []
    : team.children.map((child) => ({
        slug: child.slug,
        name: child.name,
      }));

  // For a team or Organization we check if it's unpublished
  // For a subteam, we check if the parent org is unpublished. A subteam can't be unpublished in itself
  const isUnpublished = team.parent ? !team.parent.slug : !team.slug;
  const isARedirectFromNonOrgLink = context.query.orgRedirection === "true";

  const considerUnpublished = isUnpublished && !isARedirectFromNonOrgLink;

  if (considerUnpublished) {
    return {
      props: {
        considerUnpublished: true,
        team: {
          id: team.id,
          slug: team.slug,
          name: team.name,
          isOrganization: team.isOrganization,
          logoUrl: team.logoUrl,
          metadata,
          parent: minimalParent,
          createdAt: null,
        },
      },
    } as const;
  }

  return {
    props: {
      team: {
        id: team.id,
        slug: team.slug,
        name: team.name,
        bio: team.bio,
        safeBio,
        theme: team.theme,
        isPrivate: team.isPrivate,
        isOrganization: team.isOrganization,
        hideBookATeamMember: team.hideBookATeamMember,
        logoUrl: team.logoUrl,
        brandColor: team.brandColor,
        darkBrandColor: team.darkBrandColor,
        metadata,
        parent: minimalParent,
        eventTypes: minimalEventTypes,
        members: minimalMembers,
        children: minimalChildren,
      },
      themeBasis: team.slug,
      markdownStrippedBio,
      isValidOrgDomain,
      currentOrgDomain,
      isSEOIndexable: allowSEOIndexing,
    },
  } as const;
};

/**
 * Removes metadata from team and just adds requestedSlug
 */
function getTeamWithoutMetadata<T extends Pick<Team, "metadata">>(team: T) {
  const { metadata, ...rest } = team;
  const teamMetadata = teamMetadataSchema.parse(metadata);
  return {
    ...rest,
    ...(typeof teamMetadata?.requestedSlug !== "undefined"
      ? { requestedSlug: teamMetadata?.requestedSlug }
      : {}),
  };
}
