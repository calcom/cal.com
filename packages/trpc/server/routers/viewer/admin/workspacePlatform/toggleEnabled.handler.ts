import type { z } from "zod";

import { WorkspacePlatformRepository } from "@calcom/features/workspace-platform/repositories/WorkspacePlatformRepository";

import type { workspacePlatformToggleEnabledSchema } from "./schema";
import { ensureNoServiceAccountKey } from "./utils";

export default async function toggleEnabledHandler({
  input,
}: {
  input: z.infer<typeof workspacePlatformToggleEnabledSchema>;
}) {
  const updatedWorkspacePlatform = await WorkspacePlatformRepository.updateById({
    id: input.id,
    data: {
      enabled: input.enabled,
    },
  });

  return ensureNoServiceAccountKey(updatedWorkspacePlatform);
}
