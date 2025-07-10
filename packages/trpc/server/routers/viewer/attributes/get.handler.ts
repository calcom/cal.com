import { z } from "zod";

import prisma from "@calcom/prisma";

import type { TrpcSessionUser } from "../../../types";
import type { ZGetAttributeSchema } from "./get.schema";
import { assertOrgMember } from "./utils";

type GetOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: ZGetAttributeSchema;
};

const getAttributeHandler = async ({ input, ctx: { user: authedUser } }: GetOptions) => {
  // assert authenticated user is part of an organization
  assertOrgMember(authedUser);
  const attribute = await prisma.attribute.findUnique({
    where: {
      teamId: authedUser.profile.organizationId,
      id: input.id,
    },
    select: {
      id: true,
      name: true,
      type: true,
      isLocked: true,
      isWeightsEnabled: true,
      options: {
        select: {
          id: true,
          value: true,
          contains: true,
          isGroup: true,
          _count: {
            select: {
              assignedUsers: true,
            },
          },
        },
      },
    },
  });

  const formattedAttribute = {
    ...attribute,
    options: attribute?.options.map((option) => {
      const { _count, ...rest } = option;
      return {
        ...rest,
        assignedUsers: _count?.assignedUsers || 0,
      };
    }),
  };

  const attrReturnValue = z.object({
    id: z.string(),
    name: z.string(),
    isLocked: z.boolean().optional(),
    isWeightsEnabled: z.boolean().optional(),
    type: z.enum(["TEXT", "NUMBER", "SINGLE_SELECT", "MULTI_SELECT"]),
    options: z.array(
      z.object({
        value: z.string(),
        id: z.string().optional(),
        isGroup: z.boolean().optional(),
        assignedUsers: z.number().optional(),
        contains: z.array(z.string()).optional(),
      })
    ),
  });

  return attrReturnValue.parse(formattedAttribute);
};

export default getAttributeHandler;
