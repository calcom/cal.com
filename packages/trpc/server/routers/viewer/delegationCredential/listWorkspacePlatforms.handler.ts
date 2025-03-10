import { WorkspacePlatformRepository } from "@calcom/lib/server/repository/workspacePlatform";

export default async function handler() {
  const workspacePlatforms = await WorkspacePlatformRepository.findAll();

  return workspacePlatforms;
}
