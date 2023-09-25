import { prisma } from "@calcom/prisma";
import { credentialForCalendarServiceSelect } from "@calcom/prisma/selects/credential";

export async function getUsersCredentials(userId: number) {
  const credentials = await prisma.credential.findMany({
    where: {
      userId,
    },
    select: credentialForCalendarServiceSelect,
    orderBy: {
      id: "asc",
    },
  });
  return credentials;
}
