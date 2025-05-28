import { TeamRepository } from "@calcom/lib/server/repository/team";

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

  return await TeamRepository.checkIfMembershipExists({ teamId, value });
};

export default checkIfMembershipExistsHandler;
