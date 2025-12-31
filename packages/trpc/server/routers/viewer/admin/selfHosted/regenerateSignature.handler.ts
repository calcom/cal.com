import type { TRegenerateSignatureInput } from "./schema";
import LicenseKeyAdminService from "@calcom/features/ee/common/server/LicenseKeyAdminService";
import { DeploymentRepository } from "@calcom/features/ee/deployment/repositories/DeploymentRepository";
import prisma from "@calcom/prisma";

type RegenerateSignatureOptions = {
  input: TRegenerateSignatureInput;
};

export async function regenerateSignatureHandler({
  input,
}: RegenerateSignatureOptions) {
  const deploymentRepo = new DeploymentRepository(prisma);
  const adminService = await LicenseKeyAdminService.create(deploymentRepo);

  const response = await adminService.regenerateSignatureToken(
    input.deploymentId
  );

  return response;
}
