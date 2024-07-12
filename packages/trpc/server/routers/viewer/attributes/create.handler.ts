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

const typesWithOptions = ["SINGLE_SELECT", "MULTI_SELECT"];

const createAttributesHandler = async ({ input, ctx }: GetOptions) => {
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

  const slug = slugify(input.name);
  const options = input.options.map((v) => v.value);
  const optionsWithoutDuplicates = Array.from(new Set(options));
  const typeHasOptions = typesWithOptions.includes(input.type);

  const attributes = await prisma.attribute.create({
    data: {
      slug,
      name: input.name,
      type: input.type,
      teamId: org.id,
    },
  });

  // Only assign options for the types that have options
  // TEXT/NUMBER don't have options
  if (typeHasOptions) {
    await prisma.attributeOption.createMany({
      data: optionsWithoutDuplicates.map((value) => ({
        attributeId: attributes.id,
        value,
        slug: slugify(value),
      })),
    });
  }

  return attributes;
};

export default createAttributesHandler;
