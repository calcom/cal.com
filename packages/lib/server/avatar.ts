import { v4 as uuidv4 } from "uuid";

import { prisma } from "@calcom/prisma";

import { convertSvgToPng } from "./imageUtils";

export const uploadAvatar = async ({ userId, avatar: data }: { userId: number; avatar: string }) => {
  const objectKey = uuidv4();
  const processedData = await convertSvgToPng(data);

  await prisma.avatar.upsert({
    where: {
      teamId_userId_isBanner_isFavicon_isHeader: {
        teamId: 0,
        userId,
        isBanner: false,
        isFavicon: false,
        isHeader: false,
      },
    },
    create: {
      userId: userId,
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

export const uploadHeader = async ({ userId, banner: data }: { userId: number; banner: string }) => {
  const objectKey = uuidv4();
  const processedData = await convertSvgToPng(data);

  await prisma.avatar.upsert({
    where: {
      teamId_userId_isBanner_isFavicon_isHeader: {
        teamId: 0,
        userId,
        isHeader: true,
        isBanner: false,
        isFavicon: false,
      },
    },
    create: {
      userId: userId,
      data: processedData,
      objectKey,
      isHeader: true,
      isBanner: false,
    },
    update: {
      data: processedData,
      objectKey,
    },
  });

  return `/api/avatar/${objectKey}.png`;
};

// export const uploadLogo = async ({ teamId,
//   logo: data,
//   isBanner = false,
// }: {
//   teamId: number;
//   logo: string;
//   isBanner?: boolean;
// }): Promise<string> => {
//   const objectKey = uuidv4();
//   const processedData = await convertSvgToPng(data);

//   await prisma.avatar.upsert({
//     where: {
//       teamId_userId_isBanner: {
//         teamId,
//         userId: 0,
//         isBanner,

//         isHeader: false,
//       },
//     },
//     create: {
//       teamId,
//       data: processedData,
//       objectKey,
//       isBanner,
//       isHeader: false,
//     },
//     update: {
//       data: processedData,
//       objectKey,
//     },
//   });

//   return `/api/avatar/${objectKey}.png`;
// };

export const uploadLogo = async ({
  userId,
  teamId,
  logo: data,
  isBanner = false,
  isFavicon = false,
  isHeader = false,
}: {
  userId?: number;
  teamId?: number;
  logo: string;
  isBanner?: boolean;
  isFavicon?: boolean;
  isHeader?: boolean;
}): Promise<string | null> => {
  if (data === "delete") {
    await prisma.avatar.deleteMany({
      where: {
        teamId: teamId ?? 0,
        userId: userId ?? 0,
        isBanner,
        isFavicon,
        isHeader,
      },
    });
    return null;
  } else {
    const objectKey = uuidv4();

    await prisma.avatar.upsert({
      where: {
        teamId_userId_isBanner_isFavicon_isHeader: {
          teamId: teamId ?? 0,
          userId: userId ?? 0,
          isBanner,
          isFavicon,
          isHeader,
        },
      },
      create: {
        teamId: teamId ?? 0,
        userId: userId ?? 0,
        data,
        objectKey,
        isBanner,
        isFavicon,
        isHeader,
      },
      update: {
        data,
        objectKey,
      },
    });

    return `/api/avatar/${objectKey}.png`;
  }
};
