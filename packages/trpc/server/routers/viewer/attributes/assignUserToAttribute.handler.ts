import logger from "@calcom/lib/logger";
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

const typesWithOptions = ["SINGLE_SELECT", "MULTI_SELECT"];

const assignUserToAttributeHandler = async ({ input, ctx }: GetOptions) => {
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

  // TODO: We need to also empty the users assignemnts for IDs that are not in in this filteredAttributes list
  // Filter out attributes that don't have a value or options set
  const filteredAttributes = input.attributes.filter((attribute) => attribute.value || attribute.options);

  // Ensure this organization can access these attributes and attribute options
  const attributes = await prisma.attribute.findMany({
    where: {
      id: {
        in: filteredAttributes.map((attribute) => attribute.id),
      },
      teamId: org.id,
    },
    select: {
      id: true,
      type: true,
      options: true,
    },
  });

  if (attributes.length !== filteredAttributes.length) {
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

  const promises: Promise<{ id: string }>[] = [];

  filteredAttributes.map(async (attribute) => {
    if (attribute.value && (!attribute.options || attribute.options.length === 0)) {
      const valueAsString = String(attribute.value);

      // Clean up any existing assignments for this attribute - we don't want to keep old assignments as these fields only have ONE value
      await prisma.attributeToUser.deleteMany({
        where: {
          memberId: membership.id,
          attributeOption: {
            attribute: {
              id: attribute.id,
            },
          },
        },
      });

      const attributeOption = prisma.attributeOption.create({
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

      promises.push(attributeOption);
    } else if (!attribute.value && attribute.options && attribute.options.length > 0) {
      // Get tha attribute type for this attribute
      const attributeType = attributes.find((attr) => attr.id === attribute.id)?.type;
      const options = attribute.options;

      if (attributeType === "SINGLE_SELECT") {
        prisma.attributeToUser.deleteMany({
          where: {
            attributeOption: {
              attribute: {
                id: attribute.id,
              },
            },
          },
        });
      }

      const selectOptionsToCreate = options?.map(async (option) => {
        return prisma.attributeToUser.create({
          data: {
            memberId: membership.id,
            attributeOptionId: option.value,
          },
          select: {
            id: true,
          },
        });
      });

      promises.push(...selectOptionsToCreate);
    }
  });

  try {
    const results = await Promise.allSettled(promises);

    if (results.some((result) => result.status === "rejected")) {
      logger.error(`When assigning attributes to user ${input.userId}, some promises were rejected`, {
        userId: input.userId,
        attributes: input.attributes,
        error: results.filter((result) => result.status === "rejected").map((result) => result.reason),
      });
    }

    return results;
  } catch (error) {
    throw error; // Re-throw the error for the caller to handle
  }
};

export default assignUserToAttributeHandler;
