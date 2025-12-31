import type { TGetDeploymentUsageInput } from "./schema";
import LicenseKeyAdminService from "@calcom/features/ee/common/server/LicenseKeyAdminService";
import { DeploymentRepository } from "@calcom/features/ee/deployment/repositories/DeploymentRepository";
import prisma from "@calcom/prisma";

type GetDeploymentUsageOptions = {
  input: TGetDeploymentUsageInput;
};

export async function getDeploymentUsageHandler({
  input,
}: GetDeploymentUsageOptions) {
  const deploymentRepo = new DeploymentRepository(prisma);
  const adminService = await LicenseKeyAdminService.create(deploymentRepo);

  const response = await adminService.getUsageByDeployment(input.deploymentId, {
    startDate: input.startDate,
    endDate: input.endDate,
  });

  return response;
}
