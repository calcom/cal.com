import slugify from "@calcom/lib/slugify";
import prisma from "@calcom/prisma";

import { TRPCError } from "@trpc/server";

import type { TrpcSessionUser } from "../../../trpc";
import type { ZCreateAttributeSchema } from "./create.schema";

type GetOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: ZCreateAttributeSchema;
};

const createAttributesHandler = async ({ input, ctx }: GetOptions) => {
  const org = ctx.user.organization;

  if (!org.id) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "You need to be apart of an organization to use this feature",
    });
  }

  const slug = slugify(input.name);

  const attributes = await prisma.attribute.create({
    data: {
      slug,
      name: input.name,
      type: input.type,
      options: input.options.map((v) => v.value),
      teamId: org.id,
    },
  });

  return attributes;
};

export default createAttributesHandler;
