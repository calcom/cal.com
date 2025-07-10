import { getBrand } from "@calcom/lib/server/getBrand";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";

type VerifyCodeOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
};

export const getBrandHandler = async ({ ctx }: VerifyCodeOptions) => {
  const {
    user: { profile },
  } = ctx;

  if (!profile.organizationId) return null;

  return await getBrand(profile.organizationId);
};

export default getBrandHandler;
