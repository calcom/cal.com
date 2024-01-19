import type { GetServerSidePropsContext } from "next";

import { orgDomainConfig } from "@calcom/features/ee/organizations/lib/orgDomains";
import { getFeatureFlagMap } from "@calcom/features/flags/server/utils";
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

export const getServerSideProps = async (context: GetServerSidePropsContext) => {
  const slug = Array.isArray(context.query?.slug) ? context.query.slug.pop() : context.query.slug;
  const { isValidOrgDomain, currentOrgDomain } = orgDomainConfig(context.req, context.params?.orgSlug);
  const isOrgContext = isValidOrgDomain && currentOrgDomain;

  // Provided by Rewrite from next.config.js
  const isOrgProfile = context.query?.isOrgProfile === "1";
  const flags = await getFeatureFlagMap(prisma);
  const isOrganizationFeatureEnabled = flags["organizations"];

  log.debug("getServerSideProps", {
    isOrgProfile,
    isOrganizationFeatureEnabled,
    isValidOrgDomain,
    currentOrgDomain,
  });

  const team = await getTeamWithMembers({
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
    (!isValidOrgDomain && !!metadata?.isOrganization) ||
    !isOrganizationFeatureEnabled
  ) {
    return { notFound: true } as const;
  }

  if (!team || (team.parent && !team.parent.slug)) {
    const unpublishedTeam = await prisma.team.findFirst({
      where: {
        ...(team?.parent
          ? { id: team.parent.id }
          : {
              metadata: {
                path: ["requestedSlug"],
                equals: slug,
              },
            }),
      },
    });

    if (!unpublishedTeam) return { notFound: true } as const;

    return {
      props: {
        isUnpublished: true,
        team: { ...unpublishedTeam, createdAt: null },
        trpcState: ssr.dehydrate(),
      },
    } as const;
  }

  team.eventTypes =
    team.eventTypes?.map((type) => ({
      ...type,
      users: type.users.map((user) => ({
        ...user,
        avatar: `/${user.username}/avatar.png`,
      })),
      descriptionAsSafeHTML: markdownToSafeHTML(type.description),
    })) ?? null;

  const safeBio = markdownToSafeHTML(team.bio) || "";

  const members = !team.isPrivate
    ? team.members.map((member) => {
        return {
          name: member.name,
          id: member.id,
          bio: member.bio,
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

  return {
    props: {
      team: { ...serializableTeam, safeBio, members, metadata },
      themeBasis: serializableTeam.slug,
      trpcState: ssr.dehydrate(),
      markdownStrippedBio,
      isValidOrgDomain,
      currentOrgDomain,
    },
  } as const;
};
