import { entityPrismaWhereClause } from "@calcom/lib/entityPermissionUtils.server";
import type { PrismaClient } from "@calcom/prisma";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";

import { TRPCError } from "@trpc/server";

import getConnectedForms from "../../lib/getConnectedForms";
import { isCalIdFormCreateEditAllowed } from "../../lib/isCalIdFormCreateEditAllowed";
import type { TCalIdDeleteFormInputSchema } from "./deleteForm.schema";

interface CalIdDeleteFormHandlerOptions {
  ctx: {
    prisma: PrismaClient;
    user: NonNullable<TrpcSessionUser>;
  };
  input: TCalIdDeleteFormInputSchema;
}
export const calIdDeleteFormHandler = async ({ ctx, input }: CalIdDeleteFormHandlerOptions) => {
  const { user, prisma } = ctx;
  if (!(await isCalIdFormCreateEditAllowed({ userId: user.id, formId: input.id, targetCalIdTeamId: null }))) {
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

export default calIdDeleteFormHandler;
