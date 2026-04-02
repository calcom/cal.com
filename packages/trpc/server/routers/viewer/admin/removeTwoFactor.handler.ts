import { prisma } from "@calcom/prisma";
import type { TrpcSessionUser } from "../../../types";
import type { TAdminRemoveTwoFactor } from "./removeTwoFactor.schema";

type GetOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TAdminRemoveTwoFactor;
};

const removeTwoFactorHandler = async ({ input }: GetOptions) => {
  const { userId } = input;
  await prisma.user.update({
    where: {
      id: userId,
    },
    data: {
      backupCodes: null,
      twoFactorEnabled: false,
      twoFactorSecret: null,
    },
  });

  return {
    success: true,
    userId,
  };
};

export default removeTwoFactorHandler;
