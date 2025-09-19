import { PERMISSION_REGISTRY } from "@calcom/features/pbac/domain/types/permission-registry";
import { prisma } from "@calcom/prisma";

export const ENABLE_PBAC_GLOBALLY = true;

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
  await prisma.teamFeatures.upsert({
    where: {
      teamId_featureId: {
        teamId: teamId,
        featureId: "pbac",
      },
    },
    create: {
      featureId: "pbac",
      teamId: teamId,
      assignedBy: "e2e",
      assignedAt: new Date(),
    },
    update: {
      assignedBy: "e2e",
      assignedAt: new Date(),
    },
  });
};
