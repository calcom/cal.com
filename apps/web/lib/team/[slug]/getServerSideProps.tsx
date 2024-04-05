import type { GetServerSidePropsContext } from "next";

import { orgDomainConfig } from "@calcom/features/ee/organizations/lib/orgDomains";
import { getFeatureFlag } from "@calcom/features/flags/server/utils";
import { getBookerBaseUrlSync } from "@calcom/lib/getBookerUrl/client";
import logger from "@calcom/lib/logger";
import { markdownToSafeHTML } from "@calcom/lib/markdownToSafeHTML";
import { getTeamWithMembers } from "@calcom/lib/server/queries/teams";
import slugify from "@calcom/lib/slugify";
import { stripMarkdown } from "@calcom/lib/stripMarkdown";
import prisma from "@calcom/prisma";
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
            isOrganization: true,
            isPrivate: true,
          },
        },
      },
    });

    if (!unpublishedTeam) return { notFound: true } as const;

    return {
      props: {
        shouldShowAsUnpublished: true,
        team: { ...unpublishedTeam, createdAt: null },
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
            avatar: `/${user.username}/avatar.png`,
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

  const { inviteToken: _inviteToken, ...serializableTeam } = team;

  // For a team we check if it's unpublished
  // For a subteam, we check if the parent org is unpublished. A subteam can never be unpublished in itself
  const isUnpublished = team.parent ? !team.parent.slug : !team.slug;
  const isARedirectFromNonOrgLink = context.query.orgRedirection === "true";
  const organization = team.parent
    ? {
        ...team.parent,
        metadata: team.parent.metadata ? teamMetadataSchema.parse(team.parent.metadata) : null,
      }
    : null;

  const shouldShowAsUnpublished = isUnpublished && !isARedirectFromNonOrgLink;

  if (shouldShowAsUnpublished) {
    console.log({
      team,
      organization,
    });
    return {
      props: {
        shouldShowAsUnpublished: true,
        team: { ...serializableTeam },
        organization,
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
      organization,
      themeBasis: serializableTeam.slug,
      trpcState: ssr.dehydrate(),
      markdownStrippedBio,
      isValidOrgDomain,
      currentOrgDomain,
    },
  } as const;
};
