import { v4 as uuidv4 } from "uuid";

import { prisma } from "@calcom/prisma";

export const uploadLogo = async ({
  teamId,
  logo: data,
  isBanner = false,
}: {
  teamId: number;
  logo: string;
  isBanner?: boolean;
}): Promise<string> => {
  const objectKey = uuidv4();

  await prisma.avatar.upsert({
    where: {
      teamId_userId_isBanner: {
        teamId,
        userId: 0,
        isBanner,
      },
    },
    create: {
      teamId,
      data,
      objectKey,
      isBanner,
    },
    update: {
      data,
      objectKey,
    },
  });

  return `/api/avatar/${objectKey}.png`;
};
