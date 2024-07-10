import prisma from "@calcom/prisma";

import { TRPCError } from "@trpc/server";

import type { TrpcSessionUser } from "../../../trpc";
import type { ZCreateAttributeSchema } from "./create.schema";

type GetOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: ZCreateAttributeSchema;
};

const createAttributesHandler = async ({ input, ctx }: GetOptions) => {
  const org = ctx.user.organization;

  if (!org.id) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "You need to be apart of an organization to use this feature",
    });
  }
  // Find all attributes that this organization has

  const attributes = await prisma.attribute.findMany({
    where: {
      teamId: org.id,
    },
  });

  return attributes;
};

export default createAttributesHandler;
