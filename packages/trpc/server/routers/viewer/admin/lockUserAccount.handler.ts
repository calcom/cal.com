import type { TrpcSessionUser } from "../../../types";
import type { TAdminLockUserAccountSchema } from "./lockUserAccount.schema";

type GetOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TAdminLockUserAccountSchema;
};

const lockUserAccountHandler = async ({ input }: GetOptions) => {
  const { userId, locked } = input;

  const user = await ctx.ctx.prisma.user.update({
    where: {
      id: userId,
    },
    data: {
      locked,
    },
  });

  if (!user) {
    throw new Error("User not found");
  }

  return {
    success: true,
    userId,
    locked,
  };
};

export default lockUserAccountHandler;
