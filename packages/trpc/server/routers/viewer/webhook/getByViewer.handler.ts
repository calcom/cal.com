import { CAL_URL } from "@calcom/lib/constants";
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

  const userWebhooks = user.webhooks;
  let webhookGroups: WebhookGroup[] = [];

  const image = user?.username ? `${CAL_URL}/${user.username}/avatar.png` : undefined;
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

  const teamWebhookGroups: WebhookGroup[] = user.teams.map((membership) => ({
    teamId: membership.team.id,
    profile: {
      name: membership.team.name,
      slug: "team/" + membership.team.slug,
      image: `${CAL_URL}/team/${membership.team.slug}/avatar.png`,
    },
    metadata: {
      readOnly: membership.role !== MembershipRole.ADMIN && membership.role !== MembershipRole.OWNER,
    },
    webhooks: membership.team.webhooks,
  }));

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
