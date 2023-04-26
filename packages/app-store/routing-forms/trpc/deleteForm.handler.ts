import type { PrismaClient } from "@prisma/client";

import { TRPCError } from "@calcom/trpc/server";
import type { TrpcSessionUser } from "@calcom/trpc/server/trpc";

import getConnectedForms from "../lib/getConnectedForms";
import { isFormEditAllowed } from "../lib/isFormEditAllowed";
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
  if (!(await isFormEditAllowed({ userId: user.id, formId: input.id }))) {
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
  return await prisma.app_RoutingForms_Form.deleteMany({
    where: {
      id: input.id,
      userId: user.id,
    },
  });
};
