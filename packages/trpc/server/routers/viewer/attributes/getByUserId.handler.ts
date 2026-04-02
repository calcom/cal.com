import prisma from "@calcom/prisma";
import type { AttributeType } from "@calcom/prisma/enums";
import { TRPCError } from "@trpc/server";
import type { TrpcSessionUser } from "../../../types";
import type { ZGetByUserIdSchema } from "./getByUserId.schema";

type GetOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: ZGetByUserIdSchema;
};

export type GroupedAttribute = {
  id: string;
  name: string;
  type: AttributeType;
  options: {
    id: string;
    slug: string;
    value: string;
    weight: number | null;
    createdByDSyncId: string | null;
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
  const membership = await prisma.membership.findUnique({
    where: {
      userId_teamId: {
        userId: input.userId,
        teamId: org.id,
      },
    },
  });

  if (!membership) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "This user is not apart of your organization",
    });
  }

  const userAttributes = await getMembershipAttributes(membership.id);
  return groupMembershipAttributes(userAttributes);
};

async function getMembershipAttributes(membershipId: number) {
  return await prisma.attributeToUser.findMany({
    where: {
      member: {
        id: membershipId,
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
      createdByDSyncId: true,
      weight: true,
    },
  });
}

type MembershipAttributes = Awaited<ReturnType<typeof getMembershipAttributes>>;

export function groupMembershipAttributes(membershipAttributes: MembershipAttributes): GroupedAttribute[] {
  return membershipAttributes.reduce<GroupedAttribute[]>((acc, assignment) => {
    const { attributeOption, createdByDSyncId, weight } = assignment;
    const { attribute: attrInfo, ...optionInfo } = attributeOption;
    const optionInfoWithCreatedByDSyncId = { ...optionInfo, createdByDSyncId, weight };
    const existingGroup = acc.find((group) => group.id === attrInfo.id);

    if (existingGroup) {
      existingGroup.options.push(optionInfoWithCreatedByDSyncId);
    } else {
      acc.push({
        id: attrInfo.id,
        name: attrInfo.name,
        type: attrInfo.type,
        options: [
          {
            ...optionInfoWithCreatedByDSyncId,
          },
        ],
      });
    }

    return acc;
  }, []);
}

export default getByUserIdHandler;
