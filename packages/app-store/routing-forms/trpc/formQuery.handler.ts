import { PermissionCheckService } from "@calcom/features/pbac/services/permission-check.service";
import { entityPrismaWhereClause } from "@calcom/lib/entityPermissionUtils.server";
import type { PrismaClient } from "@calcom/prisma";
import { MembershipRole } from "@calcom/prisma/enums";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";

import { TRPCError } from "@trpc/server";

import { getSerializableForm } from "../lib/getSerializableForm";
import type { TFormQueryInputSchema } from "./formQuery.schema";

interface FormsHandlerOptions {
  ctx: {
    prisma: PrismaClient;
    user: NonNullable<TrpcSessionUser>;
  };
  input: TFormQueryInputSchema;
}

export const formQueryHandler = async ({ ctx, input }: FormsHandlerOptions) => {
  const { prisma, user } = ctx;
  const form = await prisma.app_RoutingForms_Form.findFirst({
    where: {
      AND: [
        entityPrismaWhereClause({ userId: user.id }),
        {
          id: input.id,
        },
      ],
    },
    include: {
      team: { select: { slug: true, name: true } },
      _count: {
        select: {
          responses: true,
        },
      },
    },
  });

  if (!form) {
    return null;
  }

  // Check PBAC permissions for team-scoped routing forms only
  // Personal forms (teamId = null) are always accessible to the owner
  if (form.teamId) {
    const permissionService = new PermissionCheckService();
    const hasPermission = await permissionService.checkPermission({
      userId: user.id,
      teamId: form.teamId,
      permission: "routingForm.read",
      fallbackRoles: [MembershipRole.MEMBER, MembershipRole.ADMIN, MembershipRole.OWNER],
    });

    if (!hasPermission) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "You don't have permission to view this routing form",
      });
    }
  }

  return await getSerializableForm({ form });
};

export default formQueryHandler;
