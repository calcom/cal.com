import { Resource } from "@calcom/features/pbac/domain/types/permission-registry";
import { getResourcePermissions } from "@calcom/features/pbac/lib/resource-permissions";
import prisma from "@calcom/prisma";
import { MembershipRole } from "@calcom/prisma/enums";
import { TRPCError } from "@trpc/server";
import type { TrpcSessionUser } from "../../../types";
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

  const membership = await prisma.membership.findFirst({
    where: {
      userId: ctx.user.id,
      teamId: org.id,
    },
    select: {
      role: true,
    },
  });

  if (!membership) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "You need to be apart of this organization to use this feature",
    });
  }

  const { canDelete } = await getResourcePermissions({
    userId: ctx.user.id,
    teamId: org.id,
    resource: Resource.Attributes,
    userRole: membership.role,
    fallbackRoles: {
      delete: {
        roles: [MembershipRole.ADMIN, MembershipRole.OWNER],
      },
    },
  });

  if (!canDelete) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "You don't have permission to delete attributes",
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
