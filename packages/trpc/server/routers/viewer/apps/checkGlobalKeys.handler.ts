import { prisma } from "@calcom/prisma";

import type { TrpcSessionUser } from "../../../trpc";
import type { CheckGlobalKeysSchemaType } from "./checkGlobalKeys.schema";

type checkForGlobalKeys = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: CheckGlobalKeysSchemaType;
};

export const checkForGlobalKeysHandler = async ({ input }: checkForGlobalKeys) => {
  const appIsGloballyInstalled = await prisma.app.findUnique({
    where: {
      slug: input.slug,
    },
  });

  return !!appIsGloballyInstalled;
};
