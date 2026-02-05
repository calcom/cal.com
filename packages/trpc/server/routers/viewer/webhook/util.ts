import type { PermissionString } from "@calcom/features/pbac/domain/types/permission-registry";
import { PermissionCheckService } from "@calcom/features/pbac/services/permission-check.service";
import { prisma } from "@calcom/prisma";
import type { MembershipRole } from "@calcom/prisma/enums";

import { TRPCError } from "@trpc/server";

import authedProcedure from "../../../procedures/authedProcedure";
import { webhookIdAndEventTypeIdSchema } from "./types";

/**
 * Creates a webhook procedure with configurable PBAC permissions
 * @param permission - The specific permission required (e.g., "webhook.create", "webhook.update")
 * @param fallbackRoles - Roles to check when PBAC is disabled (defaults to ["ADMIN", "OWNER"])
 * @returns A procedure that checks the specified permission
 */
export const createWebhookPbacProcedure = (
  permission: PermissionString,
  fallbackRoles: MembershipRole[] = ["ADMIN", "OWNER"]
) => {
  return authedProcedure.input(webhookIdAndEventTypeIdSchema.optional()).use(async ({ ctx, input, next }) => {
    // Endpoints that just read the logged in user's data - like 'list' don't necessarily have any input
    if (!input) return next();

    const { id, teamId, eventTypeId } = input;
    const permissionCheckService = new PermissionCheckService();

    if (id) {
      // Check if user is authorized to edit webhook
      const webhook = await prisma.webhook.findUnique({
        where: { id },
        select: {
          id: true,
          userId: true,
          teamId: true,
          eventTypeId: true,
        },
      });

      if (!webhook) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      // Validate consistency
      if (teamId && teamId !== webhook.teamId) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }

      if (eventTypeId && eventTypeId !== webhook.eventTypeId) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }

      // For team webhooks, check PBAC permissions
      if (webhook.teamId) {
        const hasPermission = await permissionCheckService.checkPermission({
          userId: ctx.user.id,
          teamId: webhook.teamId,
          permission,
          fallbackRoles,
        });

        if (!hasPermission) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: `Permission required: ${permission}`,
          });
        }
      } else if (webhook.eventTypeId) {
        // For event type webhooks, check if the user owns the event type or has team permissions
        const eventType = await prisma.eventType.findUnique({
          where: { id: webhook.eventTypeId },
          include: { team: true },
        });

        if (!eventType) {
          throw new TRPCError({ code: "NOT_FOUND" });
        }

        if (eventType.userId !== ctx.user.id) {
          // Check team permissions if it's a team event type
          if (eventType.teamId) {
            const hasPermission = await permissionCheckService.checkPermission({
              userId: ctx.user.id,
              teamId: eventType.teamId,
              permission,
              fallbackRoles,
            });

            if (!hasPermission) {
              throw new TRPCError({
                code: "FORBIDDEN",
                message: `Permission required: ${permission}`,
              });
            }
          } else {
            throw new TRPCError({
              code: "FORBIDDEN",
              message: `Permission required: ${permission}`,
            });
          }
        }
      } else if (webhook.userId && webhook.userId !== ctx.user.id) {
        // For personal webhooks, only the owner can manage
        throw new TRPCError({
          code: "FORBIDDEN",
          message: `Permission required: ${permission}`,
        });
      }
    } else {
      // Check if user is authorized to create webhook on event type or team
      if (teamId) {
        const hasPermission = await permissionCheckService.checkPermission({
          userId: ctx.user.id,
          teamId,
          permission,
          fallbackRoles,
        });

        if (!hasPermission) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: `Permission required: ${permission}`,
          });
        }
      } else if (eventTypeId) {
        const eventType = await prisma.eventType.findUnique({
          where: { id: eventTypeId },
          include: { team: true },
        });

        if (!eventType) {
          throw new TRPCError({ code: "NOT_FOUND" });
        }

        if (eventType.userId !== ctx.user.id) {
          // Check team permissions if it's a team event type
          if (eventType.teamId) {
            const hasPermission = await permissionCheckService.checkPermission({
              userId: ctx.user.id,
              teamId: eventType.teamId,
              permission,
              fallbackRoles,
            });

            if (!hasPermission) {
              throw new TRPCError({
                code: "FORBIDDEN",
                message: `Permission required: ${permission}`,
              });
            }
          } else {
            throw new TRPCError({
              code: "FORBIDDEN",
              message: `Permission required: ${permission}`,
            });
          }
        }
      }
    }

    return next();
  });
};

/**
 * Legacy webhook procedure - uses the new PBAC procedure with webhook.update permission
 * This maintains backward compatibility while supporting PBAC
 */
export const webhookProcedure = createWebhookPbacProcedure("webhook.update", ["ADMIN", "OWNER"]);
