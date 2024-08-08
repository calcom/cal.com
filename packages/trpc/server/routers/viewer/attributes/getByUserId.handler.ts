import prisma from "@calcom/prisma";
import type { AttributeType } from "@calcom/prisma/enums";

import { TRPCError } from "@trpc/server";

import type { TrpcSessionUser } from "../../../trpc";
import type { ZGetByUserIdSchema } from "./getByUserId.schema";

type GetOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: ZGetByUserIdSchema;
};

type GroupedAttribute = {
  id: string;
  name: string;
  type: AttributeType;
  options: {
    id: string;
    slug: string;
    value: string;
  }[];
};

const getByUserIdHandler = async ({ input, ctx }: GetOptions) => {
  const org = ctx.user.organization;

  if (!org.id) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "You need to be apart of an organization to use this feature",
    });
  }

  // Ensure user is apart of the organization
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

  const userAttributes = await prisma.attributeToUser.findMany({
    where: {
      member: {
        id: membership.id,
      },
      attributeOption: {
        attribute: {
          enabled: true,
        },
      },
    },
    select: {
      attributeOption: {
        select: {
          id: true,
          value: true,
          slug: true,
          attribute: {
            select: {
              id: true,
              name: true,
              type: true,
            },
          },
        },
      },
    },
  });

  const groupedAttributes = userAttributes.reduce<GroupedAttribute[]>((acc, attribute) => {
    const { attributeOption } = attribute;
    const { attribute: attrInfo, ...optionInfo } = attributeOption;

    const existingGroup = acc.find((group) => group.id === attrInfo.id);

    if (existingGroup) {
      existingGroup.options.push(optionInfo);
    } else {
      acc.push({
        id: attrInfo.id,
        name: attrInfo.name,
        type: attrInfo.type,
        options: [
          {
            ...optionInfo,
          },
        ],
      });
    }

    return acc;
  }, []);

  return groupedAttributes;
};

export default getByUserIdHandler;
