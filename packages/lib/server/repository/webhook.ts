import { getPlaceholderAvatar } from "@calcom/lib/defaultAvatarImage";
import { compareMembership } from "@calcom/lib/event-types/getEventTypesByViewer";
import { getUserAvatarUrl } from "@calcom/lib/getAvatarUrl";
import { prisma } from "@calcom/prisma";
import type { Webhook } from "@calcom/prisma/client";
import type { UserPermissionRole } from "@calcom/prisma/enums";
import { MembershipRole } from "@calcom/prisma/enums";

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

type CalIdWebhookGroup = {
  calIdTeamId?: number | null;
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
const filterWebhooks = (webhook: Webhook) => {
  const appIds = [
    "zapier",
    "make",
    // Add more if needed
  ];

  return !appIds.some((appId: string) => webhook.appId == appId);
};

export class WebhookRepository {
  static async getAllWebhooksByUserId({
    userId,
    userRole,
  }: {
    userId: number;
    userRole?: UserPermissionRole;
  }) {
    const user = await prisma.user.findUnique({
      where: {
        id: userId,
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
                logoUrl: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw new Error("User not found");
    }

    let userWebhooks = user.webhooks;
    userWebhooks = userWebhooks.filter(filterWebhooks);
    let webhookGroups: WebhookGroup[] = [];

    webhookGroups.push({
      teamId: null,
      profile: {
        slug: user.username,
        name: user.name,
        image: getUserAvatarUrl({
          avatarUrl: user.avatarUrl,
        }),
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

    const teamWebhookGroups: WebhookGroup[] = user.teams.map((membership) => {
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
          image: getPlaceholderAvatar(membership.team.logoUrl, membership.team.name),
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

    if (userRole === "ADMIN") {
      const platformWebhooks = await prisma.webhook.findMany({
        where: { platform: true },
      });
      webhookGroups.push({
        teamId: null,
        profile: {
          slug: "Platform",
          name: "Platform",
          image: getPlaceholderAvatar(null, "Platform"),
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
  }

  static async findByWebhookId(webhookId?: string) {
    return await prisma.webhook.findUniqueOrThrow({
      where: {
        id: webhookId,
      },
      select: {
        id: true,
        subscriberUrl: true,
        payloadTemplate: true,
        active: true,
        eventTriggers: true,
        secret: true,
        teamId: true,
        userId: true,
        platform: true,
        time: true,
        timeUnit: true,
      },
    });
  }

  static async getAllCalIdWebhooksByUserId({
    userId,
    userRole,
  }: {
    userId: number;
    userRole?: UserPermissionRole;
  }) {
    const user = await prisma.user.findUnique({
      where: {
        id: userId,
      },
      select: {
        username: true,
        avatarUrl: true,
        name: true,
        webhooks: true,
        calIdTeams: {
          where: {
            accepted: true,
          },
          select: {
            role: true,
            calIdTeam: {
              select: {
                id: true,
                name: true,
                slug: true,
                metadata: true,
                members: {
                  select: {
                    userId: true,
                  },
                },
                webhooks: true,
                logoUrl: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw new Error("User not found");
    }

    let userWebhooks = user.webhooks;
    userWebhooks = userWebhooks.filter(filterWebhooks);
    let webhookGroups: CalIdWebhookGroup[] = [];

    webhookGroups.push({
      calIdTeamId: null,
      profile: {
        slug: user.username,
        name: user.name,
        image: getUserAvatarUrl({
          avatarUrl: user.avatarUrl,
        }),
      },
      webhooks: userWebhooks,
      metadata: {
        readOnly: false,
      },
    });

    const calIdTeamWebhookGroups: CalIdWebhookGroup[] = user.calIdTeams.map((calIdMembership) => {
      return {
        calIdTeamId: calIdMembership.calIdTeam.id,
        profile: {
          name: calIdMembership.calIdTeam.name,
          slug: calIdMembership.calIdTeam.slug || null,
          image: getPlaceholderAvatar(calIdMembership.calIdTeam.logoUrl, calIdMembership.calIdTeam.name),
        },
        metadata: {
          readOnly: calIdMembership.role === MembershipRole.MEMBER,
        },
        webhooks: calIdMembership.calIdTeam.webhooks.filter(filterWebhooks),
      };
    });

    webhookGroups = webhookGroups.concat(calIdTeamWebhookGroups);

    if (userRole === "ADMIN") {
      const platformWebhooks = await prisma.webhook.findMany({
        where: { platform: true },
      });
      webhookGroups.push({
        calIdTeamId: null,
        profile: {
          slug: "Platform",
          name: "Platform",
          image: getPlaceholderAvatar(null, "Platform"),
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
        calIdTeamId: group.calIdTeamId,
        ...group.profile,
        ...group.metadata,
      })),
    };
  }

  static async findByCalIdTeamId(calIdTeamId: number) {
    return await prisma.webhook.findMany({
      where: {
        calIdTeamId: calIdTeamId,
      },
      select: {
        id: true,
        subscriberUrl: true,
        payloadTemplate: true,
        active: true,
        eventTriggers: true,
        secret: true,
        userId: true,
        calIdTeamId: true,
        time: true,
        timeUnit: true,
      },
    });
  }
}
