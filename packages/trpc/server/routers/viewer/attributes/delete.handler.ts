import prisma from "@calcom/prisma";

import { TRPCError } from "@trpc/server";

import type { TrpcSessionUser } from "../../../trpc";
import type { ZDeleteAttributeSchema } from "./delete.schema";

type DeleteOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: ZDeleteAttributeSchema;
};

const deleteAttributeHandler = async ({ input, ctx }: DeleteOptions) => {
  const org = ctx.user.organization;

  if (!org.id) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "You need to be apart of an organization to use this feature",
    });
  }

  if (!org.isOrgAdmin) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "You need to be an admin of the organization to modify attributes",
    });
  }

  const attribute = await prisma.attribute.delete({
    where: {
      teamId: org.id,
      id: input.id,
    },
  });

  return attribute;
};

export default deleteAttributeHandler;
