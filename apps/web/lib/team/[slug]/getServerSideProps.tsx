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
