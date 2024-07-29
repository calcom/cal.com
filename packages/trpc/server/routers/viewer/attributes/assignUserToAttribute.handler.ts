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

  console.log(attributeOptionIds);
  console.log(attributeOptions);

  if (attributeOptions.length !== attributeOptionIds.length) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "You do not have access to these attribute options",
    });
  }

  // Find the memebrship for the user

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

  const promises: Promise<void>[] = [];

  filteredAttributes.map((attribute) => {
    if (attribute.value && (!attribute.options || attribute.options.length === 0)) {
      const valueAsString = String(attribute.value);
      const transaction = prisma.$transaction(async (trx) => {
        const attributeOption = await trx.attributeOption.create({
          data: {
            value: valueAsString,
            slug: slugify(valueAsString),
            attribute: {
              connect: {
                id: attribute.id,
              },
            },
          },
        });

        // Delete any existing assignments for this attribute
        await trx.attributeToUser.deleteMany({
          where: {
            attributeOptionId: attributeOption.id,
          },
        });

        await trx.attributeToUser.create({
          data: {
            memberId: membership.id,
            attributeOptionId: attributeOption.id,
          },
        });
      });
      promises.push(transaction);
    } else if (!attribute.value && attribute.options && attribute.options.length > 0) {
      const transaction = prisma.$transaction(async (trx) => {
        const options = attribute.options;

        options?.map(async (option) => {
          await trx.attributeToUser.create({
            data: {
              memberId: membership.id,
              attributeOptionId: option.value,
            },
          });
        });
      });

      promises.push(transaction);
    }
  });

  Promise.all(promises);

  return 1;
};

export default assignUserToAttributeHandler;
