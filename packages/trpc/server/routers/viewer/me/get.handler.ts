import type { Session } from "next-auth";

import { ViewerService } from "@calcom/lib/server/service/viewer";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";

import type { TGetInputSchema } from "./get.schema";

type MeOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
    session: Session;
  };
  input: TGetInputSchema;
};

export const getHandler = async ({ ctx, input }: MeOptions) => {
  const { user: sessionUser, session } = ctx;

  return await ViewerService.getMe({
    upId: session.upId,
    userId: session.user.id,
    opts: input,
  });
};
