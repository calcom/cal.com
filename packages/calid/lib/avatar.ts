import { v4 as uuidv4 } from "uuid";

import { convertSvgToPng } from "@calcom/lib/server/imageUtils";
import { prisma } from "@calcom/prisma";

export const uploadTeamLogo = async ({ teamId, logo }: { teamId: number; logo: string }): Promise<string> => {
  const objectKey = uuidv4();
  const processedData = await convertSvgToPng(logo);

  await prisma.calIdTeam.update({
    where: {
      id: teamId,
    },
    data: {
      logoUrl: `/api/avatar/${objectKey}.png`,
    },
  });

  await prisma.avatar.upsert({
    where: {
      teamId_userId_isBanner_isFavicon_isHeader: {
        teamId,
        userId: 0,
        isBanner: false,
        isFavicon: false,
        isHeader: false,
      },
    },
    create: {
      teamId,
      userId: 0,
      data: processedData,
      objectKey,
      isBanner: false,
      isHeader: false,
    },
    update: {
      data: processedData,
      objectKey,
    },
  });

  return `/api/avatar/${objectKey}.png`;
};
