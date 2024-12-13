import slugify from "@calcom/lib/slugify";
import prisma from "@calcom/prisma";
import type { Attribute } from "@calcom/prisma/client";
import { Prisma } from "@calcom/prisma/client";

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

  const slug = slugify(input.name);
  const options = input.options.map((v) => v.value);
  const optionsWithoutDuplicates = Array.from(new Set(options));
  const typeHasOptions = typesWithOptions.includes(input.type);

  let attributes: Attribute;
  try {
    attributes = await prisma.attribute.create({
      data: {
        slug,
        name: input.name,
        type: input.type,
        isLocked: input.isLocked,
        teamId: org.id,
      },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new Error("A record with that name already exists. Please choose another one.");
    } else {
      throw error; // Re-throw the error if it's not a unique constraint violation
    }
  }

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
