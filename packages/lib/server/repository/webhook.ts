import { PermissionCheckService } from "@calcom/features/pbac/services/permission-check.service";
import { getPlaceholderAvatar } from "@calcom/lib/defaultAvatarImage";
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
    canModify: boolean;
    canDelete: boolean;
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

  static async getFilteredWebhooksForUser({
    userId,
    userRole,
  }: {
    userId: number;
    userRole?: UserPermissionRole;
  }) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        name: true,
        avatarUrl: true,
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
                logoUrl: true,
                webhooks: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw new Error("User not found");
    }

    // Use permission service which handles both PBAC and role-based fallbacks
    const permissionService = new PermissionCheckService();

    // Build webhook groups with proper permissions
    const webhookGroups: WebhookGroup[] = [];

    // Add user's personal webhooks
    webhookGroups.push({
      teamId: null,
      profile: {
        slug: user.username,
        name: user.name,
        image: getUserAvatarUrl({ avatarUrl: user.avatarUrl }),
      },
      webhooks: user.webhooks.filter(filterWebhooks),
      metadata: {
        canModify: true,
        canDelete: true,
      },
    });

    // Check permissions for each team
    // The permission service handles PBAC when enabled and falls back to role-based permissions
    for (const membership of user.teams) {
      const teamId = membership.team.id;

      // Check read permission (fallback: MEMBER, ADMIN, OWNER can read)
      const canRead = await permissionService.checkPermission({
        userId,
        teamId,
        permission: "webhook.read",
        fallbackRoles: [MembershipRole.MEMBER, MembershipRole.ADMIN, MembershipRole.OWNER],
      });

      if (!canRead) {
        // User doesn't have permission to view this team's webhooks
        continue;
      }

      // Check update/delete permissions in parallel (fallback: only ADMIN, OWNER can modify)
      const [canUpdate, canDelete] = await Promise.all([
        permissionService.checkPermission({
          userId,
          teamId,
          permission: "webhook.update",
          fallbackRoles: [MembershipRole.ADMIN, MembershipRole.OWNER],
        }),
        permissionService.checkPermission({
          userId,
          teamId,
          permission: "webhook.delete",
          fallbackRoles: [MembershipRole.ADMIN, MembershipRole.OWNER],
        }),
      ]);

      webhookGroups.push({
        teamId: membership.team.id,
        profile: {
          name: membership.team.name,
          slug: membership.team.slug || null,
          image: getPlaceholderAvatar(membership.team.logoUrl, membership.team.name),
        },
        webhooks: membership.team.webhooks.filter(filterWebhooks),
        metadata: {
          canModify: canUpdate,
          canDelete,
        },
      });
    }

    // Add platform webhooks for admins
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
          canDelete: true,
          canModify: true,
        },
      });
    }

    return {
      webhookGroups: webhookGroups.filter((group) => group.webhooks.length > 0),
      profiles: webhookGroups.map((group) => ({
        teamId: group.teamId,
        ...group.profile,
        ...group.metadata,
      })),
    };
  }
}
