import type { TGetKeyUsageInput } from "./schema";
import LicenseKeyAdminService from "@calcom/features/ee/common/server/LicenseKeyAdminService";
import { DeploymentRepository } from "@calcom/features/ee/deployment/repositories/DeploymentRepository";
import prisma from "@calcom/prisma";

type GetKeyUsageOptions = {
  input: TGetKeyUsageInput;
};

export async function getKeyUsageHandler({ input }: GetKeyUsageOptions) {
  const deploymentRepo = new DeploymentRepository(prisma);
  const adminService = await LicenseKeyAdminService.create(deploymentRepo);

  const response = await adminService.getUsageByKey(input.keyId, {
    startDate: input.startDate,
    endDate: input.endDate,
  });

  return response;
}
