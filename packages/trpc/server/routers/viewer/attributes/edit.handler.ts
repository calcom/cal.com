import slugify from "@calcom/lib/slugify";
import prisma from "@calcom/prisma";

import { TRPCError } from "@trpc/server";

import type { TrpcSessionUser } from "../../../trpc";
import type { ZEditAttributeSchema } from "./edit.schema";

type GetOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: ZEditAttributeSchema;
};

const typesWithOptions = ["SINGLE_SELECT", "MULTI_SELECT"];

const editAttributesHandler = async ({ input, ctx }: GetOptions) => {
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

  const foundAttribute = await prisma.attribute.findUnique({
    where: {
      id: input.attributeId,
      teamId: org.id,
    },
    select: {
      id: true,
    },
  });

  if (!foundAttribute) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Attribute not found",
    });
  }

  const attributes = await prisma.attribute.update({
    where: {
      id: input.attributeId,
    },
    data: {
      name: input.name,
      type: input.type,
      teamId: org.id,
    },
    select: {
      id: true,
    },
  });

  await prisma.attributeOption.deleteMany({
    where: {
      attributeId: input.attributeId,
    },
  });

  if (typeHasOptions) {
    await prisma.attributeOption.createMany({
      data: optionsWithoutDuplicates.map((value) => ({
        attributeId: input.attributeId,
        value,
        slug: slugify(value),
      })),
    });
  }

  return attributes;
};

export default editAttributesHandler;
