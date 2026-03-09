import { getTeamFeatureRepository } from "@calcom/features/di/containers/TeamFeatureRepository";
import type { FeatureId } from "@calcom/features/flags/config";
import { PERMISSION_REGISTRY } from "@calcom/features/pbac/domain/types/permission-registry";

// Create array of all permissions from PERMISSION_REGISTRY
export const createAllPermissionsArray = () => {
  const allPermissions: { resource: string; action: string }[] = [];

  Object.entries(PERMISSION_REGISTRY).forEach(([resource, resourceConfig]) => {
    if (resource === "*") {
      return;
    }
    Object.entries(resourceConfig).forEach(([action, _details]) => {
      allPermissions.push({ resource, action });
    });
  });

  return allPermissions;
};

export const enablePBACForTeam = async (teamId: number) => {
  const teamFeatureRepository = getTeamFeatureRepository();
  await teamFeatureRepository.upsert(teamId, "pbac" as FeatureId, true, "e2e");
};
