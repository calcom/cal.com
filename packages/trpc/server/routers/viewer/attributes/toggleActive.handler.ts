import { Resource } from "@calcom/features/pbac/domain/types/permission-registry";
import { getResourcePermissions } from "@calcom/features/pbac/lib/resource-permissions";
import prisma from "@calcom/prisma";
import { MembershipRole } from "@calcom/prisma/client";

import { TRPCError } from "@trpc/server";

import type { TrpcSessionUser } from "../../../types";
import type { ZToggleActiveSchema } from "./toggleActive.schema";

type GetOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: ZToggleActiveSchema;
};

const toggleActiveHandler = async ({ input, ctx }: GetOptions) => {
  const org = ctx.user.organization;
  const userRole = ctx.user.org?.role;

  if (!org.id || !userRole) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "You need to be apart of an organization to use this feature",
    });
  }

  const { canEdit } = await getResourcePermissions({
    userId: ctx.user.id,
    teamId: org.id,
    resource: Resource.Attributes,
    userRole,
    fallbackRoles: {
      update: {
        roles: [MembershipRole.ADMIN, MembershipRole.OWNER],
      },
    },
  });

  if (!canEdit) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "You don't have permission to modify attributes",
    });
  }

  // Ensure that this users org owns the attribute
  const attribute = await prisma.attribute.findUnique({
    where: {
      id: input.attributeId,
      teamId: org.id,
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
