import { WorkspacePlatformRepository } from "@calcom/lib/server/repository/workspacePlatform";

import { TRPCError } from "@trpc/server";

export default async function listHandler() {
  try {
    return await WorkspacePlatformRepository.findAll();
  } catch (error) {
    console.error(error);
    throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to fetch workspace platforms" });
  }
}
