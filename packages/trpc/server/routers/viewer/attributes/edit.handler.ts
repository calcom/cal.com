import { Resource } from "@calcom/features/pbac/domain/types/permission-registry";
import { getResourcePermissions } from "@calcom/features/pbac/lib/resource-permissions";
import slugify from "@calcom/lib/slugify";
import prisma from "@calcom/prisma";
import { MembershipRole } from "@calcom/prisma/enums";

import { TRPCError } from "@trpc/server";

import type { TrpcSessionUser } from "../../../types";
import type { ZEditAttributeSchema } from "./edit.schema";
import { getOptionsWithValidContains } from "./utils";

type GetOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: ZEditAttributeSchema;
};

const editAttributesHandler = async ({ input, ctx }: GetOptions) => {
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

  const { canEdit } = await getResourcePermissions({
    userId: ctx.user.id,
    teamId: org.id,
    resource: Resource.Attributes,
    userRole: membership.role,
    fallbackRoles: {
      update: {
        roles: [MembershipRole.ADMIN, MembershipRole.OWNER],
      },
    },
  });

  if (!canEdit) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "You don't have permission to edit attributes",
    });
  }

  // If an option is removed, it is to be removed from contains of corresponding group as well if any
  const options = getOptionsWithValidContains(input.options);

  const foundAttribute = await prisma.attribute.findUnique({
    where: {
      id: input.attributeId,
      teamId: org.id,
    },
    select: {
      id: true,
    },
  });

  if (!foundAttribute) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Attribute not found",
    });
  }

  const attributes = await prisma.attribute.update({
    where: {
      id: input.attributeId,
    },
    data: {
      name: input.name,
      type: input.type,
      teamId: org.id,
      isLocked: input.isLocked,
      isWeightsEnabled: input.isWeightsEnabled,
    },
    select: {
      id: true,
    },
  });

  // Check all ids of options passed in are owned by the attribute and organization
  await validateOptionsBelongToAttribute(options, attributes.id);

  await prisma.$transaction(async (tx) => {
    const updateOptions = options.filter((option) => option.id !== undefined && option.id !== "");
    const updatedOptionsIds = updateOptions.map((option) => option.id!);
    // We need to delete all options that are not present in this UpdateOptions.id (as they have been deleted)
    await tx.attributeOption.deleteMany({
      where: {
        attributeId: attributes.id,
        NOT: [
          {
            id: {
              in: updatedOptionsIds,
            },
          },
        ],
      },
    });

    const createOptions = options.filter((option) => option.id === undefined || option.id === "");

    const updatePromises = updateOptions.map(async (option) => {
      return tx.attributeOption.update({
        where: {
          id: option.id,
        },
        data: {
          value: option.value,
          slug: slugify(option.value),
          isGroup: option.isGroup,
          contains: option.contains,
        },
      });
    });

    // Create new options where Ids are not present in the options array
    const createPromises = createOptions.map(async (option) => {
      return tx.attributeOption.create({
        data: {
          attributeId: attributes.id,
          value: option.value,
          isGroup: option.isGroup,
          contains: option.contains,
          slug: slugify(option.value),
        },
      });
    });

    await Promise.all(updatePromises);
    await Promise.all(createPromises);
  });

  return attributes;
};

async function validateOptionsBelongToAttribute(
  options: ZEditAttributeSchema["options"],
  attributeId: string
) {
  // We have to use ! here to make sure typescript knows that the id is not undefined
  const optionsWithId = options
    .filter((option) => option.id !== undefined && option.id !== "")
    .map((option) => option.id!);

  // Check all ids of options passed in are owned by the attribute
  const optionsWithIdOwnedByAttribute = await prisma.attributeOption.findMany({
    where: {
      id: {
        in: optionsWithId,
      },
      attributeId: attributeId,
    },
    select: {
      id: true,
    },
  });

  if (optionsWithIdOwnedByAttribute.length !== optionsWithId.length) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "You can't edit options that are not owned by the attribute",
    });
  }
}

export default editAttributesHandler;
