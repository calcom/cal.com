import { PrismaWorkspacePlatformRepository } from "@calcom/lib/server/repository/prismaWorkspacePlatform";

import { TRPCError } from "@trpc/server";

import { ensureNoServiceAccountKey } from "./utils";

export default async function listHandler() {
  try {
    const workspacePlatforms = await PrismaWorkspacePlatformRepository.findAll();
    return workspacePlatforms.map(ensureNoServiceAccountKey);
  } catch (error) {
    console.error(error);
    throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to fetch workspace platforms" });
  }
}
