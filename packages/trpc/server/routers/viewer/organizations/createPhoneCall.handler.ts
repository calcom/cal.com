import type { createPhoneCallSchema } from "@calcom/features/calAIPhone/zod-utils";
import { handleCreatePhoneCall } from "@calcom/features/handleCreatePhoneCall";
import type { PrismaClient } from "@calcom/prisma";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";
import type { z } from "zod";

type CreatePhoneCallProps = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
    prisma: PrismaClient;
  };
  input: z.infer<typeof createPhoneCallSchema>;
};

const createPhoneCallHandler = async ({ input, ctx }: CreatePhoneCallProps) => {
  return await handleCreatePhoneCall({
    user: {
      id: ctx.user.id,
      timeZone: ctx.user.timeZone,
      profile: { organization: { id: ctx.user.profile.organization?.id } },
    },
    input,
  });
};

export default createPhoneCallHandler;
