import { prisma } from "@calcom/prisma";

import type { TrpcSessionUser } from "../../../../types";

type CheckForGCalOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
};

export const removeCurrentGoogleWorkspaceConnection = async ({ ctx }: CheckForGCalOptions) => {
  // There should only ever be one google_workspace_directory credential per user but we delete many as we can't make type unique
  const gWorkspacePresent = await prisma.credential.deleteMany({
    where: {
      type: "google_workspace_directory",
      userId: ctx.user.id,
    },
  });

  return { deleted: gWorkspacePresent?.count };
};
