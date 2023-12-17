import { getBookerUrl } from "@calcom/lib/server/getBookerUrl";
import { prisma } from "@calcom/prisma";
import type { Webhook } from "@calcom/prisma/client";
import { MembershipRole } from "@calcom/prisma/enums";
import { teamMetadataSchema } from "@calcom/prisma/zod-utils";
import type { TrpcSessionUser } from "@calcom/trpc/server/trpc";

import { TRPCError } from "@trpc/server";

import { compareMembership } from "../eventTypes/getByViewer.handler";

type GetByViewerOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
};

type WebhookGroup = {
  teamId?: number | null;
  profile: {
    slug: string | null;
    name: string | null;
    image?: string;
  };
  metadata?: {
    readOnly: boolean;
  };
  webhooks: Webhook[];
};

export type WebhooksByViewer = {
  webhookGroups: WebhookGroup[];
  profiles: {
    readOnly?: boolean | undefined;
    slug: string | null;
    name: string | null;
    image?: string | undefined;
    teamId: number | null | undefined;
  }[];
};

const filterWebhooks = (webhook: Webhook) => {
  const appIds = [
    "zapier",
    // Add more if needed
  ];

  return !appIds.some((appId: string) => webhook.appId == appId);
};

export const getByViewerHandler = async ({ ctx }: GetByViewerOptions) => {
  const user = await prisma.user.findUnique({
    where: {
      id: ctx.user.id,
    },
    select: {
      username: true,
      avatar: true,
      name: true,
      webhooks: true,
      organizationId: true,
      teams: {
        where: {
          accepted: true,
        },
        select: {
          role: true,
          team: {
            select: {
              id: true,
              name: true,
              slug: true,
              parentId: true,
              metadata: true,
              members: {
                select: {
                  userId: true,
                },
              },
              webhooks: true,
            },
          },
        },
      },
    },
  });

  if (!user) {
    throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
  }

  let userWebhooks = user.webhooks;
  userWebhooks = userWebhooks.filter(filterWebhooks);
  let webhookGroups: WebhookGroup[] = [];
  const bookerUrl = await getBookerUrl(user);

  const image = user?.username ? `${bookerUrl}/${user.username}/avatar.png` : undefined;
  webhookGroups.push({
    teamId: null,
    profile: {
      slug: user.username,
      name: user.name,
      image,
    },
    webhooks: userWebhooks,
    metadata: {
      readOnly: false,
    },
  });

  const teamMemberships = user.teams.map((membership) => ({
    teamId: membership.team.id,
    membershipRole: membership.role,
  }));

  const teamWebhookGroups: WebhookGroup[] = user.teams
    .filter((mmship) => {
      const metadata = teamMetadataSchema.parse(mmship.team.metadata);
      return !metadata?.isOrganization;
    })
    .map((membership) => {
      const orgMembership = teamMemberships.find(
        (teamM) => teamM.teamId === membership.team.parentId
      )?.membershipRole;
      return {
        teamId: membership.team.id,
        profile: {
          name: membership.team.name,
          slug: membership.team.slug
            ? !membership.team.parentId
              ? `/team`
              : `${membership.team.slug}`
            : null,
          image: `${bookerUrl}/team/${membership.team.slug}/avatar.png`,
        },
        metadata: {
          readOnly:
            membership.role ===
            (membership.team.parentId
              ? orgMembership && compareMembership(orgMembership, membership.role)
                ? orgMembership
                : MembershipRole.MEMBER
              : MembershipRole.MEMBER),
        },
        webhooks: membership.team.webhooks.filter(filterWebhooks),
      };
    });

  webhookGroups = webhookGroups.concat(teamWebhookGroups);

  return {
    webhookGroups: webhookGroups.filter((groupBy) => !!groupBy.webhooks?.length),
    profiles: webhookGroups.map((group) => ({
      teamId: group.teamId,
      ...group.profile,
      ...group.metadata,
    })),
  };
};
