import slugify from "@calcom/lib/slugify";
import prisma from "@calcom/prisma";
import type { Attribute } from "@calcom/prisma/client";
import { Prisma } from "@calcom/prisma/client";

import type { TrpcSessionUser } from "../../../types";
import type { ZCreateAttributeSchema } from "./create.schema";
import { assertOrgMember, getOptionsWithValidContains } from "./utils";

type GetOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: ZCreateAttributeSchema;
};

const typesWithOptions = ["SINGLE_SELECT", "MULTI_SELECT"];

const createAttributesHandler = async ({ input, ctx: { user: authedUser } }: GetOptions) => {
  assertOrgMember(authedUser);

  const slug = slugify(input.name);
  const uniqueOptions = getOptionsWithValidContains(input.options);

  const typeHasOptions = typesWithOptions.includes(input.type);

  let attributes: Attribute;
  try {
    attributes = await prisma.attribute.create({
      data: {
        slug,
        name: input.name,
        type: input.type,
        isLocked: input.isLocked,
        teamId: authedUser.profile.organizationId,
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
      data: uniqueOptions.map(({ value, isGroup }) => ({
        attributeId: attributes.id,
        value,
        slug: slugify(value),
        isGroup,
      })),
    });
  }

  return attributes;
};

export default createAttributesHandler;
