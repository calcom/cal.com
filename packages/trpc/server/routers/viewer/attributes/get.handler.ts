import { z } from "zod";

import prisma from "@calcom/prisma";

import { TRPCError } from "@trpc/server";

import type { TrpcSessionUser } from "../../../types";
import type { ZGetAttributeSchema } from "./get.schema";

type GetOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: ZGetAttributeSchema;
};

const getAttributeHandler = async ({ input, ctx }: GetOptions) => {
  const org = ctx.user.organization;

  if (!org.id) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "You need to be apart of an organization to use this feature",
    });
  }

  const attribute = await prisma.attribute.findUnique({
    where: {
      teamId: org.id,
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
