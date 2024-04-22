import { compareMembership } from "@calcom/lib/event-types/getEventTypesByViewer";
import { getBookerBaseUrl } from "@calcom/lib/getBookerUrl/server";
import { prisma } from "@calcom/prisma";
import type { Webhook } from "@calcom/prisma/client";
import { MembershipRole } from "@calcom/prisma/enums";
import type { TrpcSessionUser } from "@calcom/trpc/server/trpc";

import { TRPCError } from "@trpc/server";

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
      avatarUrl: true,
      name: true,
      webhooks: true,
      teams: {
        where: {
          accepted: true,
        },
        select: {
          role: true,
          team: {
            select: {
              id: true,
              isOrganization: true,
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
  const bookerUrl = await getBookerBaseUrl(ctx.user.profile?.organizationId ?? null);

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
      return !mmship.team.isOrganization;
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

  if (ctx.user.role === "ADMIN") {
    const platformWebhooks = await prisma.webhook.findMany({
      where: { platform: true },
    });
    webhookGroups.push({
      teamId: null,
      profile: {
        slug: "Platform",
        name: "Platform",
        image,
      },
      webhooks: platformWebhooks,
      metadata: {
        readOnly: false,
      },
    });
  }

  return {
    webhookGroups: webhookGroups.filter((groupBy) => !!groupBy.webhooks?.length),
    profiles: webhookGroups.map((group) => ({
      teamId: group.teamId,
      ...group.profile,
      ...group.metadata,
    })),
  };
};
