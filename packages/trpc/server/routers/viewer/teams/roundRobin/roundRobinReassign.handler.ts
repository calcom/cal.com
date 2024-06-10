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
  const { eventTypeId, bookingId } = input;

  await roundRobinReassignment({ eventTypeId, bookingId });
};

export default roundRobinReassignHandler;
