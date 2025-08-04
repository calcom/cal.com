import { PermissionCheckService } from "@calcom/features/pbac/services/permission-check.service";
import { entityPrismaWhereClause } from "@calcom/lib/entityPermissionUtils.server";
import { PrismaRoutingFormRepository } from "@calcom/lib/server/repository/PrismaRoutingFormRepository";
import type { PrismaClient } from "@calcom/prisma";
import { MembershipRole } from "@calcom/prisma/enums";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";

import { TRPCError } from "@trpc/server";

import getConnectedForms from "../lib/getConnectedForms";
import { isFormCreateEditAllowed } from "../lib/isFormCreateEditAllowed";
import type { TDeleteFormInputSchema } from "./deleteForm.schema";

interface DeleteFormHandlerOptions {
  ctx: {
    prisma: PrismaClient;
    user: NonNullable<TrpcSessionUser>;
  };
  input: TDeleteFormInputSchema;
}
export const deleteFormHandler = async ({ ctx, input }: DeleteFormHandlerOptions) => {
  const { user, prisma } = ctx;

  // First get the form to check its team context
  const form = await PrismaRoutingFormRepository.findById(input.id, {
    select: { teamId: true, userId: true },
  });

  if (!form) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Form not found",
    });
  }

  // Check PBAC permissions for team-scoped routing forms only
  // Personal forms (teamId = null) are always allowed for the owner
  if (form.teamId) {
    const permissionService = new PermissionCheckService();
    const hasPermission = await permissionService.checkPermission({
      userId: user.id,
      teamId: form.teamId,
      permission: "routingForm.delete",
      fallbackRoles: [MembershipRole.ADMIN, MembershipRole.OWNER],
    });

    if (!hasPermission) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "You don't have permission to delete routing forms for this team",
      });
    }
  }

  // Legacy permission check as fallback
  if (!(await isFormCreateEditAllowed({ userId: user.id, formId: input.id, targetTeamId: null }))) {
    throw new TRPCError({
      code: "FORBIDDEN",
    });
  }

  const areFormsUsingIt = (
    await getConnectedForms(prisma, {
      id: input.id,
      userId: user.id,
    })
  ).length;

  if (areFormsUsingIt) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "This form is being used by other forms. Please remove it's usage from there first.",
    });
  }

  const deletedRes = await prisma.app_RoutingForms_Form.deleteMany({
    where: {
      id: input.id,
      ...entityPrismaWhereClause({ userId: user.id }),
    },
  });

  if (!deletedRes.count) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Form seems to be already deleted.",
    });
  }
  return deletedRes;
};

export default deleteFormHandler;
