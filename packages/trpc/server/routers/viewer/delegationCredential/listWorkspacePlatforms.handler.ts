import { PrismaWorkspacePlatformRepository } from "@calcom/lib/server/repository/workspacePlatform";

export default async function handler() {
  const workspacePlatforms = await PrismaWorkspacePlatformRepository.findAll();

  return workspacePlatforms;
}
