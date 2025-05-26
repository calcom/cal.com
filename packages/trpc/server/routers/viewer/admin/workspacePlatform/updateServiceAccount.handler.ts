import type { z } from "zod";

import { WorkspacePlatformRepository } from "@calcom/lib/server/repository/workspacePlatform";

import { TRPCError } from "@trpc/server";

import type { workspacePlatformUpdateServiceAccountSchema } from "./schema";
import { ensureNoServiceAccountKey } from "./utils";

export default async function updateServiceAccountHandler({
  input,
}: {
  input: z.infer<typeof workspacePlatformUpdateServiceAccountSchema>;
}) {
  try {
    const updatedWorkspacePlatform = await WorkspacePlatformRepository.updateById({
      id: input.id,
      data: {
        defaultServiceAccountKey: input.defaultServiceAccountKey,
      },
    });
    return ensureNoServiceAccountKey(updatedWorkspacePlatform);
  } catch (error) {
    console.error(error);
    throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to update service account" });
  }
}
