import { entityPrismaWhereClause } from "@calcom/lib/entityPermissionUtils.server";
import { AuthorizationError, ValidationError } from "@calcom/lib/errors";
import type { PrismaClient } from "@calcom/prisma";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";

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
  if (!(await isFormCreateEditAllowed({ userId: user.id, formId: input.id, targetTeamId: null }))) {
    throw new AuthorizationError("Access forbidden");
  }

  const areFormsUsingIt = (
    await getConnectedForms(prisma, {
      id: input.id,
      userId: user.id,
    })
  ).length;

  if (areFormsUsingIt) {
    throw new ValidationError(
      "This form is being used by other forms. Please remove it's usage from there first."
    );
  }

  const deletedRes = await prisma.app_RoutingForms_Form.deleteMany({
    where: {
      id: input.id,
      ...entityPrismaWhereClause({ userId: user.id }),
    },
  });

  if (!deletedRes.count) {
    throw new ValidationError("Form seems to be already deleted.");
  }
  return deletedRes;
};

export default deleteFormHandler;
