import type { z } from "zod";

import { PrismaWorkspacePlatformRepository } from "@calcom/lib/server/repository/prismaWorkspacePlatform";

import type { workspacePlatformToggleEnabledSchema } from "./schema";
import { ensureNoServiceAccountKey } from "./utils";

export default async function toggleEnabledHandler({
  input,
}: {
  input: z.infer<typeof workspacePlatformToggleEnabledSchema>;
}) {
  const updatedWorkspacePlatform = await PrismaWorkspacePlatformRepository.updateById({
    id: input.id,
    data: {
      enabled: input.enabled,
    },
  });

  return ensureNoServiceAccountKey(updatedWorkspacePlatform);
}
