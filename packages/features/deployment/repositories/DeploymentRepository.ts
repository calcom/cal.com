import type { PrismaClient as PrismaClientWithExtensions } from "@calcom/prisma";
import type { PrismaClient as PrismaClientWithoutExtensions } from "@calcom/prisma/client";

import type { IDeploymentRepository } from "./IDeploymentRepository";

export class DeploymentRepository implements IDeploymentRepository {
  constructor(private prisma: PrismaClientWithoutExtensions | PrismaClientWithExtensions) {}

  async getLicenseKeyWithId(id: number): Promise<string | null> {
    // This repository is special as it is used within prisma extensions
    const deployment = await (this.prisma as PrismaClientWithoutExtensions).deployment.findUnique({
      where: { id },
      select: { licenseKey: true },
    });
    return deployment?.licenseKey || null;
  }

  async getSignatureToken(id: number): Promise<string | null> {
    const deployment = await (this.prisma as PrismaClientWithoutExtensions).deployment.findUnique({
      where: { id },
      select: { signatureTokenEncrypted: true },
    });
    return deployment?.signatureTokenEncrypted || null;
  }
}
