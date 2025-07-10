import prisma from "@calcom/prisma";

import { TRPCError } from "@trpc/server";

import type { TrpcSessionUser } from "../../../types";
import type { ZToggleActiveSchema } from "./toggleActive.schema";
import { assertOrgMember } from "./utils";

type GetOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: ZToggleActiveSchema;
};

const toggleActiveHandler = async ({ input, ctx: { user: authedUser } }: GetOptions) => {
  // assert authenticated user is part of an organization
  assertOrgMember(authedUser);
  // Ensure that this users org owns the attribute
  const attribute = await prisma.attribute.findUnique({
    where: {
      id: input.attributeId,
      teamId: authedUser.profile.organizationId,
    },
    select: {
      id: true,
      enabled: true,
    },
  });

  if (!attribute) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Attribute not found",
    });
  }

  // Toggle the attribute
  await prisma.attribute.update({
    where: {
      id: input.attributeId,
    },
    data: {
      enabled: !attribute.enabled,
    },
  });

  // Save us refetching the attribute to get the correct value
  return {
    ...attribute,
    enabled: !attribute.enabled,
  };
};

export default toggleActiveHandler;
