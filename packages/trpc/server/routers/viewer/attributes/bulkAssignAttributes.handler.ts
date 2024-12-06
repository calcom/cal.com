import slugify from "@calcom/lib/slugify";
import prisma from "@calcom/prisma";

import { TRPCError } from "@trpc/server";

import type { TrpcSessionUser } from "../../../trpc";
import type { ZBulkAssignAttributes } from "./bulkAssignAttributes.schema";

type GetOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: ZBulkAssignAttributes;
};

const bulkAssignAttributesHandler = async ({ input, ctx }: GetOptions) => {
  const org = ctx.user.organization;

  if (!org.id) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "You need to be part of an organization to use this feature",
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
      id: true,
      type: true,
      options: true,
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

  const results = await Promise.all(
    input.userIds.map(async (userId) => {
      return prisma.$transaction(async (tx) => {
        const membership = await tx.membership.findFirst({
          where: {
            userId: userId,
            // @ts-expect-error we check this higher in the logic
            teamId: org?.id,
          },
        });

        if (!membership) {
          return {
            userId,
            success: false,
            message: "User is not part of your organization",
          };
        }

        for (const attribute of input.attributes) {
          // TEXT, NUMBER
          if (attribute.value && !attribute.options) {
            const valueAsString = String(attribute.value);

            // Check if it is already the value
            const existingAttributeOption = await tx.attributeToUser.findFirst({
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
              await tx.attributeOption.update({
                where: {
                  id: existingAttributeOption.attributeOption.id,
                },
                data: {
                  value: valueAsString,
                  slug: slugify(valueAsString),
                },
              });
            } else {
              await tx.attributeOption.create({
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
              });
            }
          } else if (!attribute.value && attribute.options && attribute.options.length > 0) {
            const options = attribute.options;

            for (const option of options) {
              // Assign the attribute option to the user
              await tx.attributeToUser.upsert({
                where: {
                  memberId_attributeOptionId: {
                    memberId: membership.id,
                    attributeOptionId: option.value,
                  },
                },
                create: {
                  memberId: membership.id,
                  attributeOptionId: option.value,
                },
                update: {}, // No update needed if it already exists
              });
            }
          }

          // Delete the attribute from the user
          if (!attribute.value && !attribute.options) {
            await tx.attributeToUser.deleteMany({
              where: {
                memberId: membership.id,
                attributeOption: {
                  attribute: {
                    id: attribute.id,
                  },
                },
              },
            });
          }
        }

        return {
          userId,
          success: true,
          message: "Attributes assigned successfully",
        };
      });
    })
  );

  const successCount = results.filter((result) => result.success).length;
  const failureCount = results.length - successCount;

  return {
    success: true,
    message: `Attributes assigned successfully for ${successCount} users. Failed for ${failureCount} users.`,
    results,
  };
};

export default bulkAssignAttributesHandler;
