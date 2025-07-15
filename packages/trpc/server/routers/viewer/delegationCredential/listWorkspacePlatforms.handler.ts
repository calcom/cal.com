import { WorkspacePlatformRepository } from "@calcom/lib/server/repository/workspacePlatformRepository";

export default async function handler() {
  const workspacePlatforms = await WorkspacePlatformRepository.findAll();

  return workspacePlatforms;
}
