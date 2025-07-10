import prisma from "@calcom/prisma";

import type { TrpcSessionUser } from "../../../types";
import type { ZDeleteAttributeSchema } from "./delete.schema";
import { assertOrgMember } from "./utils";

type DeleteOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: ZDeleteAttributeSchema;
};

const deleteAttributeHandler = async ({ input, ctx: { user: authedUser } }: DeleteOptions) => {
  // assert authenticated user is part of an organization
  assertOrgMember(authedUser);

  const attribute = await prisma.attribute.delete({
    where: {
      teamId: authedUser.profile.organizationId,
      id: input.id,
    },
  });

  return attribute;
};

export default deleteAttributeHandler;
