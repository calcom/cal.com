import type { PrismaClient as PrismaClientWithoutExtensions } from "@prisma/client";

import type { PrismaClient as PrismaClientWithExtensions } from "@calcom/prisma";

import type { IDeploymentRepository } from "./deployment.interface";

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
}
