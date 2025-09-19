import { PermissionCheckService } from "@calcom/features/pbac/services/permission-check.service";
import { updateTriggerForExistingBookings } from "@calcom/features/webhooks/lib/scheduleTrigger";
import { prisma } from "@calcom/prisma";
import type { Prisma } from "@calcom/prisma/client";
import { MembershipRole } from "@calcom/prisma/enums";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";

import { TRPCError } from "@trpc/server";

import type { TDeleteInputSchema } from "./delete.schema";

type DeleteOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TDeleteInputSchema;
};

export const deleteHandler = async ({ ctx, input }: DeleteOptions) => {
  const { id } = input;

  const where: Prisma.WebhookWhereInput = { AND: [{ id: id }] };

  if (Array.isArray(where.AND)) {
    if (input.eventTypeId) {
      where.AND.push({ eventTypeId: input.eventTypeId });
    } else if (input.teamId) {
      const permissionService = new PermissionCheckService();

      const hasPermission = await permissionService.checkPermission({
        userId: ctx.user.id,
        teamId: input.teamId,
        permission: "webhook.delete",
        fallbackRoles: [MembershipRole.ADMIN, MembershipRole.OWNER],
      });

      if (!hasPermission) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
        });
      }

      where.AND.push({ teamId: input.teamId });
    } else if (ctx.user.role == "ADMIN") {
      where.AND.push({ OR: [{ platform: true }, { userId: ctx.user.id }] });
    } else {
      where.AND.push({ userId: ctx.user.id });
    }
  }

  const webhookToDelete = await prisma.webhook.findFirst({
    where,
  });

  if (webhookToDelete) {
    await prisma.webhook.delete({
      where: {
        id: webhookToDelete.id,
      },
    });

    await updateTriggerForExistingBookings(webhookToDelete, webhookToDelete.eventTriggers, []);
  }

  return {
    id,
  };
};
