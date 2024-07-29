import type { PrismaClient } from "@calcom/prisma";

export async function getDeploymentKey(prisma: PrismaClient) {
  if (process.env.CALCOM_LICENSE_KEY) {
    return process.env.CALCOM_LICENSE_KEY;
  }
  const deployment = await prisma.deployment.findUnique({
    where: { id: 1 },
    select: { licenseKey: true },
  });

  return deployment?.licenseKey || "";
}
