import getConnectedForms from "@calcom/app-store/routing-forms/lib/getConnectedForms";
import { entityPrismaWhereClause } from "@calcom/features/pbac/lib/entityPermissionUtils.server";
import type { PrismaClient } from "@calcom/prisma";
import { MembershipRole } from "@calcom/prisma/enums";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";

import { TRPCError } from "@trpc/server";

import type { TDeleteFormInputSchema } from "./deleteForm.schema";
import { checkPermissionOnExistingRoutingForm } from "./permissions";

interface DeleteFormHandlerOptions {
  ctx: {
    prisma: PrismaClient;
    user: NonNullable<TrpcSessionUser>;
  };
  input: TDeleteFormInputSchema;
}
export const deleteFormHandler = async ({ ctx, input }: DeleteFormHandlerOptions) => {
  const { user, prisma } = ctx;

  await checkPermissionOnExistingRoutingForm({
    formId: input.id,
    userId: user.id,
    permission: "routingForm.delete",
    fallbackRoles: [MembershipRole.ADMIN, MembershipRole.OWNER],
  });

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
