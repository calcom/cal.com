import { WorkspacePlatformRepository } from "@calcom/lib/server/repository/workspacePlatform.repository";

export default async function handler() {
  const workspacePlatforms = await WorkspacePlatformRepository.findAll();

  return workspacePlatforms;
}
