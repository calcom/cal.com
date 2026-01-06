import type { IDeploymentRepository } from "@calcom/features/ee/deployment/repositories/IDeploymentRepository";
import prisma from "@calcom/prisma";

type AppStatus = {
  slug: string;
  dirName: string;
  enabled: boolean;
  categories: string[];
};

class HealthcheckRepository {
  async listApps(): Promise<AppStatus[]> {
    const apps = await prisma.app.findMany({
      select: {
        slug: true,
        dirName: true,
        enabled: true,
        categories: true,
      },
      orderBy: {
        slug: "asc",
      },
    });

    return apps;
  }

  async getDeploymentLicenseKey(): Promise<string | null> {
    try {
      const deployment = await prisma.deployment.findUnique({
        where: { id: 1 },
        select: { licenseKey: true },
      });
      return deployment?.licenseKey || null;
    } catch {
      // Deployment table might not exist in some setups
      return null;
    }
  }

  async ping(): Promise<{ connected: boolean; error?: string }> {
    try {
      await prisma.$queryRaw`SELECT 1`;
      return { connected: true };
    } catch (error) {
      let errorMessage = "Unknown database error";
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      return {
        connected: false,
        error: errorMessage,
      };
    }
  }

  getDeploymentRepository(): IDeploymentRepository {
    return {
      async getLicenseKeyWithId(id: number): Promise<string | null> {
        try {
          const deployment = await prisma.deployment.findUnique({
            where: { id },
            select: { licenseKey: true },
          });
          return deployment?.licenseKey || null;
        } catch {
          return null;
        }
      },
      async getSignatureToken(id: number): Promise<string | null> {
        try {
          const deployment = await prisma.deployment.findUnique({
            where: { id },
            select: { signatureTokenEncrypted: true },
          });
          return deployment?.signatureTokenEncrypted || null;
        } catch {
          return null;
        }
      },
    };
  }
}

const healthcheckRepository: HealthcheckRepository = new HealthcheckRepository();

export type { AppStatus };
export { healthcheckRepository };
