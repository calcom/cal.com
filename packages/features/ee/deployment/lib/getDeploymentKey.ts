import type { IDeploymentRepository } from "@calcom/lib/server/repository/deployment.interface";

export async function getDeploymentKey(deploymentRepo: IDeploymentRepository): Promise<string> {
  if (process.env.CALCOM_LICENSE_KEY) {
    return process.env.CALCOM_LICENSE_KEY;
  }
  const licenseKey = await deploymentRepo.getLicenseKeyWithId(1);
  return licenseKey || "";
}
