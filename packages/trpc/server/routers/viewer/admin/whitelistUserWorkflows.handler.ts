import { UserRepository } from "@calcom/lib/server/repository/user";

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

  const user = await UserRepository.updateWhitelistWorkflows({
    id: userId,
    whitelistWorkflows: whitelist,
  });

  return { whitelistWorkflows: user.whitelistWorkflows };
};

export default whitelistUserWorkflows;
