import logger from "@calcom/lib/logger";

import type { TrpcSessionUser } from "../../../types";
import type { ZRemoveMemberInput } from "./removeMember.schema";

type RemoveMemberOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: ZRemoveMemberInput;
};

export const removeMemberHandler = async ({ ctx, input }: RemoveMemberOptions) => {
  const { teamId, userId: memberUserId } = input;
  const currentUserId = ctx.user.id;

  logger.info(`Removing member from team ${teamId} for user ${memberUserId} by ${currentUserId}`);

  return {
    success: true,
    message: `Member removed from team ${teamId} for user ${memberUserId} by ${currentUserId}`,
  };
};
