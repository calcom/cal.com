import { symmetricDecrypt } from "@calcom/lib/crypto";
import logger from "@calcom/lib/logger";
import type { IDeploymentRepository } from "@calcom/lib/server/repository/deployment.interface";

const log = logger.getSubLogger({ prefix: ["getDeploymentKey"] });

export async function getDeploymentKey(deploymentRepo: IDeploymentRepository): Promise<string> {
  if (process.env.CALCOM_LICENSE_KEY) {
    return process.env.CALCOM_LICENSE_KEY;
  }
  const licenseKey = await deploymentRepo.getLicenseKeyWithId(1);
  return licenseKey || "";
}

export async function getDeploymentSignatureToken(
  deploymentRepo: IDeploymentRepository
): Promise<string | null> {
  if (process.env.CAL_SIGNATURE_TOKEN) {
    return process.env.CAL_SIGNATURE_TOKEN;
  }
  const signatureTokenEncrypted = await deploymentRepo.getSignatureToken(1);

  if (!signatureTokenEncrypted) {
    log.error("Signature token not found in database or set in environment variable");
    return null;
  }

  const decryptedSignatureToken = symmetricDecrypt(
    signatureTokenEncrypted,
    process.env.CALENDSO_ENCRYPTION_KEY || ""
  );

  return decryptedSignatureToken || null;
}
