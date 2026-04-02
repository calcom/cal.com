import { Resource } from "@calcom/features/pbac/domain/types/permission-registry";
import { getResourcePermissions } from "@calcom/features/pbac/lib/resource-permissions";
import slugify from "@calcom/lib/slugify";
import prisma from "@calcom/prisma";
import type { Attribute } from "@calcom/prisma/client";
import { Prisma } from "@calcom/prisma/client";
import { MembershipRole } from "@calcom/prisma/enums";
import { TRPCError } from "@trpc/server";
import type { TrpcSessionUser } from "../../../types";
import type { ZCreateAttributeSchema } from "./create.schema";
import { getOptionsWithValidContains } from "./utils";

type GetOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: ZCreateAttributeSchema;
};

const typesWithOptions = ["SINGLE_SELECT", "MULTI_SELECT"];

const createAttributesHandler = async ({ input, ctx }: GetOptions) => {
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

  const { canCreate } = await getResourcePermissions({
    userId: ctx.user.id,
    teamId: org.id,
    resource: Resource.Attributes,
    userRole: membership.role,
    fallbackRoles: {
      create: {
        roles: [MembershipRole.ADMIN, MembershipRole.OWNER],
      },
    },
  });

  if (!canCreate) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "You don't have permission to create attributes",
    });
  }

  const slug = slugify(input.name);
  const uniqueOptions = getOptionsWithValidContains(input.options);

  const typeHasOptions = typesWithOptions.includes(input.type);

  let attributes: Attribute;
  try {
    attributes = await prisma.attribute.create({
      data: {
        slug,
        name: input.name,
        type: input.type,
        isLocked: input.isLocked,
        teamId: org.id,
      },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new Error("A record with that name already exists. Please choose another one.");
    } else {
      throw error; // Re-throw the error if it's not a unique constraint violation
    }
  }

  // Only assign options for the types that have options
  // TEXT/NUMBER don't have options
  if (typeHasOptions) {
    await prisma.attributeOption.createMany({
      data: uniqueOptions.map(({ value, isGroup }) => ({
        attributeId: attributes.id,
        value,
        slug: slugify(value),
        isGroup,
      })),
    });
  }

  return attributes;
};

export default createAttributesHandler;
