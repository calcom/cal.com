import { v4 as uuidv4 } from "uuid";

import { prisma } from "@calcom/prisma";

import { convertSvgToPng } from "./imageUtils";

export const uploadAvatar = async ({ userId, avatar: data }: { userId: number; avatar: string }) => {
  const objectKey = uuidv4();
  const processedData = await convertSvgToPng(data);

  await prisma.avatar.upsert({
    where: {
      teamId_userId_isBanner: {
        teamId: 0,
        userId,
        isBanner: false,
      },
    },
    create: {
      userId: userId,
      data: processedData,
      objectKey,
      isBanner: false,
    },
    update: {
      data: processedData,
      objectKey,
    },
  });

  return `/api/avatar/${objectKey}.png`;
};

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
  const processedData = await convertSvgToPng(data);

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
      data: processedData,
      objectKey,
      isBanner,
    },
    update: {
      data: processedData,
      objectKey,
    },
  });

  return `/api/avatar/${objectKey}.png`;
};

/**
 * Upload a business logo for a user's public booking page.
 * Uses teamId=-1 to distinguish from user avatars (teamId=0) and team logos (teamId>0).
 * Automatically replaces any existing logo via upsert.
 *
 * @param userId - The ID of the user uploading the logo
 * @param data - Base64-encoded image data (PNG, JPG, or SVG)
 * @returns The public URL path for accessing the uploaded logo
 */
export const uploadUserLogo = async (userId: number, data: string): Promise<string> => {
  const objectKey = uuidv4();
  const processedData = await convertSvgToPng(data);

  // Delete old logo if it exists (before upsert to handle cleanup)
  await prisma.avatar.deleteMany({
    where: {
      teamId: -1,
      userId,
      isBanner: false,
    },
  });

  // Create new logo record
  await prisma.avatar.create({
    data: {
      teamId: -1, // Special marker for user branding assets
      userId,
      data: processedData,
      objectKey,
      isBanner: false, // false = logo, true = favicon
    },
  });

  return `/api/avatar/${objectKey}.png`;
};

/**
 * Upload a custom favicon for a user's public booking page.
 * Uses teamId=-1 and isBanner=true to store favicons separately from logos.
 * Automatically replaces any existing favicon via upsert.
 *
 * @param userId - The ID of the user uploading the favicon
 * @param data - Base64-encoded icon data (ICO or PNG)
 * @returns The public URL path for accessing the uploaded favicon
 */
export const uploadUserFavicon = async (userId: number, data: string): Promise<string> => {
  const objectKey = uuidv4();
  const processedData = await convertSvgToPng(data);

  // Delete old favicon if it exists (before create to handle cleanup)
  await prisma.avatar.deleteMany({
    where: {
      teamId: -1,
      userId,
      isBanner: true,
    },
  });

  // Create new favicon record
  await prisma.avatar.create({
    data: {
      teamId: -1, // Special marker for user branding assets
      userId,
      data: processedData,
      objectKey,
      isBanner: true, // false = logo, true = favicon
    },
  });

  return `/api/avatar/${objectKey}.png`;
};
