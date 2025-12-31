import type { TGetDeploymentKeysInput } from "./schema";
import LicenseKeyAdminService from "@calcom/features/ee/common/server/LicenseKeyAdminService";
import { DeploymentRepository } from "@calcom/features/ee/deployment/repositories/DeploymentRepository";
import prisma from "@calcom/prisma";

type GetDeploymentKeysOptions = {
  input: TGetDeploymentKeysInput;
};

export async function getDeploymentKeysHandler({
  input,
}: GetDeploymentKeysOptions) {
  const deploymentRepo = new DeploymentRepository(prisma);
  const adminService = await LicenseKeyAdminService.create(deploymentRepo);

  const response = await adminService.getKeysByDeployment(input.deploymentId, {
    page: input.page,
    limit: input.limit,
  });

  return response;
}
