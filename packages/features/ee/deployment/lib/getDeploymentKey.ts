import type { IDeploymentRepository } from "@calcom/lib/server/repository/deployment.interface";

export async function getDeploymentKey(deploymentRepo: IDeploymentRepository): Promise<string> {
  if (process.env.CALCOM_LICENSE_KEY) {
    return process.env.CALCOM_LICENSE_KEY;
  }
  const licenseKey = await deploymentRepo.getLicenseKeyWithId(1);
  return licenseKey || "";
}

export async function getDeploymentSignatureToken(deploymentRepo: IDeploymentRepository): Promise<string> {
  if (process.env.CAL_SIGNATURE_TOKEN) {
    return process.env.CAL_SIGNATURE_TOKEN;
  }
  const signatureToken = await deploymentRepo.getSignatureToken(1);
  return signatureToken || "";
}
