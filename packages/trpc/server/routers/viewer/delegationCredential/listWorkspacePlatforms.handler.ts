import { WorkspacePlatformRepository } from "@calcom/features/workspace-platform/repositories/WorkspacePlatformRepository";

export default async function handler() {
  const workspacePlatforms = await WorkspacePlatformRepository.findAll();

  return workspacePlatforms;
}
