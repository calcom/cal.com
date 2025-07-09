import type { z } from "zod";

import type { createPhoneCallSchema } from "@calcom/features/ee/cal-ai-phone/zod-utils";
import { handleCreatePhoneCall } from "@calcom/features/handleCreatePhoneCall";
import { mapBusinessErrorToTRPCError } from "@calcom/lib/errorMapping";
import type { PrismaClient } from "@calcom/prisma";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";

type CreatePhoneCallProps = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
    prisma: PrismaClient;
  };
  input: z.infer<typeof createPhoneCallSchema>;
};

const createPhoneCallHandler = async ({ input, ctx }: CreatePhoneCallProps) => {
  try {
    return await handleCreatePhoneCall({
      user: {
        id: ctx.user.id,
        timeZone: ctx.user.timeZone,
        profile: { organization: { id: ctx.user.profile.organization?.id } },
      },
      input,
    });
  } catch (error) {
    throw mapBusinessErrorToTRPCError(error);
  }
};

export default createPhoneCallHandler;
