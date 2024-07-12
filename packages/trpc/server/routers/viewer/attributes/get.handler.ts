import { z } from "zod";

import prisma from "@calcom/prisma";

import { TRPCError } from "@trpc/server";

import type { TrpcSessionUser } from "../../../trpc";
import type { ZGetAttributeSchema } from "./get.schema";

type GetOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: ZGetAttributeSchema;
};

const typesWithOptions = ["SINGLE_SELECT", "MULTI_SELECT"];

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
      options: {
        select: {
          value: true,
        },
      },
    },
  });

  const attrReturnValue = z.object({
    id: z.string(),
    name: z.string(),
    type: z.enum(["TEXT", "NUMBER", "SINGLE_SELECT", "MULTI_SELECT"]),
    options: z.array(z.object({ value: z.string() })),
  });

  return attrReturnValue.parse(attribute);
};

export default getAttributeHandler;
