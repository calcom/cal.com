import { prisma } from "@calcom/prisma";

export async function getUsersCredentials(userId: number) {
  const credentials = await prisma.credential.findMany({
    where: {
      userId,
    },
    select: {
      id: true,
      type: true,
      key: true,
      userId: true,
      appId: true,
      invalid: true,
      teamId: true,
    },
    orderBy: {
      id: "asc",
    },
  });
  return credentials;
}
