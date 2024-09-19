import { AdminRepository } from "@calcom/lib/server/repository/admin";

import type { TrpcSessionUser } from "../../../trpc";

type GetOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
};

const getSMSLockStateTeamsUsers = async ({ ctx }: GetOptions) => {
  return await AdminRepository.getSMSLockStateTeamsUsers();
};

export default getSMSLockStateTeamsUsers;
