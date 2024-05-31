import type { GetServerSidePropsContext } from "next";

import { orgDomainConfig } from "@calcom/features/ee/organizations/lib/orgDomains";
import { getFeatureFlag } from "@calcom/features/flags/server/utils";
import { getUserAvatarUrl } from "@calcom/lib/getAvatarUrl";
import { getBookerBaseUrlSync } from "@calcom/lib/getBookerUrl/client";
import logger from "@calcom/lib/logger";
import { markdownToSafeHTML } from "@calcom/lib/markdownToSafeHTML";
import { getTeamWithMembers } from "@calcom/lib/server/queries/teams";
import slugify from "@calcom/lib/slugify";
import { stripMarkdown } from "@calcom/lib/stripMarkdown";
import prisma from "@calcom/prisma";
import type { Team } from "@calcom/prisma/client";
import { RedirectType } from "@calcom/prisma/client";
import { teamMetadataSchema } from "@calcom/prisma/zod-utils";

import { getTemporaryOrgRedirect } from "@lib/getTemporaryOrgRedirect";

import { ssrInit } from "@server/lib/ssr";

const log = logger.getSubLogger({ prefix: ["team/[slug]"] });

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
  const organizationsEnabled = await getFeatureFlag(prisma, "organizations");

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

  const ssr = await ssrInit(context);
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
        trpcState: ssr.dehydrate(),
      },
    } as const;
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
        trpcState: ssr.dehydrate(),
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
      trpcState: ssr.dehydrate(),
      markdownStrippedBio,
      isValidOrgDomain,
      currentOrgDomain,
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
