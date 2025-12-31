import type { TListDeploymentsInput } from "./schema";
import LicenseKeyAdminService from "@calcom/features/ee/common/server/LicenseKeyAdminService";
import { DeploymentRepository } from "@calcom/features/ee/deployment/repositories/DeploymentRepository";
import prisma from "@calcom/prisma";

type ListDeploymentsOptions = {
  input: TListDeploymentsInput;
};

export async function listDeploymentsHandler({
  input,
}: ListDeploymentsOptions) {
  const deploymentRepo = new DeploymentRepository(prisma);
  const adminService = await LicenseKeyAdminService.create(deploymentRepo);

  const response = await adminService.listDeployments({
    page: input.page,
    limit: input.limit,
    billingEmail: input.billingEmail,
    customerId: input.customerId,
    createdAtFrom: input.createdAtFrom,
    createdAtTo: input.createdAtTo,
    hasActiveKeys: input.hasActiveKeys,
  });

  return response;
}
