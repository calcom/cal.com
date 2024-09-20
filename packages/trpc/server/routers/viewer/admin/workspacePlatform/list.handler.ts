import { WorkspacePlatformRepository } from "@calcom/lib/server/repository/workspacePlatform";
import { ensureNoServiceAccountKey } from "./utils";
import { TRPCError } from "@trpc/server";

export default async function listHandler() {
  try {
    const workspacePlatforms = await WorkspacePlatformRepository.findAll();
    return workspacePlatforms.map(ensureNoServiceAccountKey);
  } catch (error) {
    console.error(error);
    throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to fetch workspace platforms" });
  }
}
