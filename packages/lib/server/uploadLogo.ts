import { v4 as uuidv4 } from "uuid";

import { prisma } from "@calcom/prisma";

export const uploadLogo = async ({
  teamId,
  logo: data,
}: {
  teamId: number;
  logo: string;
}): Promise<string> => {
  const objectKey = uuidv4();

  await prisma.avatar.upsert({
    where: {
      teamId_userId: {
        teamId,
        userId: 0,
      },
    },
    create: {
      teamId,
      data,
      objectKey,
    },
    update: {
      data,
      objectKey,
    },
  });

  return `/api/avatar/${objectKey}.png`;
};
