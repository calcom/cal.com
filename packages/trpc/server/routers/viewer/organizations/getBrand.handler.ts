import { getBrand } from "@calcom/lib/server/getBrand";
import type { TrpcSessionUser } from "@calcom/trpc/server/trpc";

type VerifyCodeOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
};

export const getBrandHandler = async ({ ctx }: VerifyCodeOptions) => {
  const { user } = ctx;

  if (!user.organizationId) return null;

  return await getBrand(user.organizationId);
};

export default getBrandHandler;
