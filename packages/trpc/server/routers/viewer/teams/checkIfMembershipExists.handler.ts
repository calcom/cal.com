import type { TrpcSessionUser } from "../../../types";
import type { TCheckIfMembershipExistsInputSchema } from "./checkIfMembershipExists.schema";

type CheckIfMembershipExistsOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TCheckIfMembershipExistsInputSchema;
};

const checkIfMembershipExistsHandler = async ({ ctx, input }: CheckIfMembershipExistsOptions) => {
  const { teamId, value } = input;

  const membership = await ctx.ctx.prisma.membership.findFirst({
    where: {
      teamId,
      user: {
        OR: [
          {
            email: value,
          },
          {
            username: value,
          },
        ],
      },
    },
  });

  return !!membership;
};

export default checkIfMembershipExistsHandler;
