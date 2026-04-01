import { AdminUsernameService } from "@calcom/features/users/lib/AdminUsernameService";
import { prisma } from "@calcom/prisma";

import type { TReleaseUsernameSchema } from "./releaseUsername.schema";

export default async function handler({ input }: { input: TReleaseUsernameSchema }) {
  const service = new AdminUsernameService(prisma);
  const { username, organizationId, mode } = input;

  if (mode === "preview") {
    return service.preview(username, organizationId);
  }

  return service.execute(username, organizationId);
}
