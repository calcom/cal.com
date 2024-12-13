import { getWhereClauseForAttributeOptionsManagedByCalcom } from "@calcom/lib/service/attribute/server/utils";
import slugify from "@calcom/lib/slugify";
import prisma from "@calcom/prisma";

import { TRPCError } from "@trpc/server";

import type { TrpcSessionUser } from "../../../trpc";
import type { ZAssignUserToAttribute } from "./assignUserToAttribute.schema";

type GetOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: ZAssignUserToAttribute;
};

const assignUserToAttributeHandler = async ({ input, ctx }: GetOptions) => {
  const org = ctx.user.organization;

  if (!org.id) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "You need to be apart of an organization to use this feature",
    });
  }

  // Ensure this organization can access these attributes and attribute options
  const attributes = await prisma.attribute.findMany({
    where: {
      id: {
        in: input.attributes.map((attribute) => attribute.id),
      },
      teamId: org.id,
    },
    select: {
      name: true,
      id: true,
      type: true,
      options: true,
      isLocked: true,
    },
  });

  if (attributes.length !== input.attributes.length) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "You do not have access to these attributes",
    });
  }

  const arrayOfAttributeOptionIds = attributes.flatMap(
    (attribute) => attribute.options?.map((option) => option.id) || []
  );

  const attributeOptionIds = Array.from(new Set(arrayOfAttributeOptionIds));

  const attributeOptions = await prisma.attributeOption.findMany({
    where: {
      id: {
        in: attributeOptionIds,
      },
      attribute: {
        teamId: org.id,
      },
    },
    select: {
      id: true,
      value: true,
      slug: true,
    },
  });

  if (attributeOptions.length !== attributeOptionIds.length) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "You do not have access to these attribute options",
    });
  }

  const membership = await prisma.membership.findFirst({
    where: {
      userId: input.userId,
      teamId: org.id,
    },
  });

  if (!membership) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "This user is not apart of your organization",
    });
  }

  // const promises: Promise<{ id: string }>[] = [];

  const unlockedAttributesInInput = input.attributes.filter((attribute) => {
    const attributeFromDb = attributes.find((a) => a.id === attribute.id);
    return !attributeFromDb?.isLocked;
  });

  const lockedAttributesFromDb = attributes.filter((attribute) => attribute.isLocked);

  unlockedAttributesInInput.map(async (attribute) => {
    // TEXT, NUMBER
    if (attribute.value && !attribute.options) {
      const valueAsString = String(attribute.value);

      // Check if it is already the value
      const existingAttributeOption = await prisma.attributeToUser.findFirst({
        where: {
          memberId: membership.id,
          attributeOption: {
            attribute: {
              id: attribute.id,
            },
          },
        },
        select: {
          id: true,
          attributeOption: {
            select: {
              id: true,
            },
          },
        },
      });

      if (existingAttributeOption) {
        // Update the value if it already exists
        await prisma.attributeOption.update({
          where: {
            id: existingAttributeOption.attributeOption.id,
          },
          data: {
            value: valueAsString,
            slug: slugify(valueAsString),
          },
        });
        return;
      }

      await prisma.attributeOption.create({
        data: {
          value: valueAsString,
          slug: slugify(valueAsString),
          attribute: {
            connect: {
              id: attribute.id,
            },
          },
          assignedUsers: {
            create: {
              memberId: membership.id,
            },
          },
        },
        select: {
          id: true,
        },
      });
    } else if (!attribute.value && attribute.options) {
      const options = attribute.options;

      // Delete all users attributes for this attribute that are not in the options list
      await prisma.attributeToUser.deleteMany({
        where: {
          attributeOption: {
            attribute: {
              id: attribute.id,
            },
          },
          memberId: membership.id,
          ...getWhereClauseForAttributeOptionsManagedByCalcom(),
          NOT: {
            id: {
              in: options.map((option) => option.value),
            },
          },
        },
      });

      options?.map(async (option) => {
        // Assign the attribute option to the user
        await prisma.attributeToUser.upsert({
          where: {
            memberId_attributeOptionId: {
              memberId: membership.id,
              attributeOptionId: option.value,
            },
          },
          create: {
            memberId: membership.id,
            attributeOptionId: option.value,
            weight: option.weight,
          },
          update: {}, // No update needed if it already exists
          select: {
            id: true,
          },
        });
      });
    }

    // Delete the attribute from the user
    if (!attribute.value && !attribute.options) {
      await prisma.attributeToUser.deleteMany({
        where: {
          memberId: membership.id,
          ...getWhereClauseForAttributeOptionsManagedByCalcom(),
          attributeOption: {
            attribute: {
              id: attribute.id,
            },
          },
        },
      });
    }
  });

  return {
    success: true,
    message: lockedAttributesFromDb.length
      ? `Attributes assigned successfully. Locked attributes ${lockedAttributesFromDb
          .map((attribute) => attribute.name)
          .join(", ")} were not assigned.`
      : "Attributes assigned successfully.",
  };
};

export default assignUserToAttributeHandler;
