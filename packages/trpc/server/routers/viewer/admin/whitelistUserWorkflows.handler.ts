import { prisma } from "@calcom/prisma";

import type { TrpcSessionUser } from "../../../types";
import type { TWhitelistUserWorkflows } from "./whitelistUserWorkflows.schema";

type GetOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TWhitelistUserWorkflows;
};

export const whitelistUserWorkflows = async ({ input }: GetOptions) => {
  const { userId, whitelist } = input;

  await prisma.user.updateMany({
    where: {
      id: userId,
    },
    data: {
      whitelistWorkflows: whitelist,
    },
  });
};

export default whitelistUserWorkflows;
