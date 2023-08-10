import type { PrismaType } from "@calcom/prisma";

export async function getDeploymentKey(prisma: PrismaType) {
  const deployment = await prisma.deployment.findUnique({
    where: { id: 1 },
    select: { licenseKey: true },
  });
  return deployment?.licenseKey || process.env.CALCOM_LICENSE_KEY || "";
}
