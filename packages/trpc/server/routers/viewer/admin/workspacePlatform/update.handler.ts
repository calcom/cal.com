import type { z } from "zod";

import { WorkspacePlatformRepository } from "@calcom/features/workspace-platform/repositories/WorkspacePlatformRepository";

import { TRPCError } from "@trpc/server";

import type { workspacePlatformUpdateSchema } from "./schema";
import { ensureNoServiceAccountKey } from "./utils";

export default async function updateHandler({
  input,
}: {
  input: z.infer<typeof workspacePlatformUpdateSchema>;
}) {
  try {
    const updatedWorkspacePlatform = await WorkspacePlatformRepository.updateById({
      id: input.id,
      data: {
        name: input.name,
        description: input.description,
      },
    });

    return ensureNoServiceAccountKey(updatedWorkspacePlatform);
  } catch (error) {
    console.error(error);
    throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to update workspace platform" });
  }
}
