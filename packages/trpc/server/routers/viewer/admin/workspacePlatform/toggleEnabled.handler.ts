import type { z } from "zod";

import { WorkspacePlatformRepository } from "@calcom/lib/server/repository/workspacePlatform";

import type { workspacePlatformToggleEnabledSchema } from "./schema";

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

  return updatedWorkspacePlatform;
}
