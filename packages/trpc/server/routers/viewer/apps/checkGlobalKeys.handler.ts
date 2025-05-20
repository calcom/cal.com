import type { TrpcSessionUser } from "../../../types";
import type { CheckGlobalKeysSchemaType } from "./checkGlobalKeys.schema";

type checkForGlobalKeys = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: CheckGlobalKeysSchemaType;
};

export const checkForGlobalKeysHandler = async ({ input }: checkForGlobalKeys) => {
  const appIsGloballyInstalled = await ctx.ctx.prisma.app.findUnique({
    where: {
      slug: input.slug,
    },
  });

  return !!appIsGloballyInstalled;
};
