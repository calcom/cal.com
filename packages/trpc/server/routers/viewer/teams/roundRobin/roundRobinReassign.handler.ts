import { roundRobinReassignment } from "@calcom/features/ee/round-robin/roundRobinReassignment";
import type { TrpcSessionUser } from "@calcom/trpc/server/trpc";

import type { TRoundRobinReassignInputSchema } from "./roundRobinReassign.schema";

type RoundRobinReassignOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TRoundRobinReassignInputSchema;
};

export const roundRobinReassignHandler = async ({ input }: RoundRobinReassignOptions) => {
  const { bookingId } = input;

  await roundRobinReassignment({ bookingId });
};

export default roundRobinReassignHandler;
