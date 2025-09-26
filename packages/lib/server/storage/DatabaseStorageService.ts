import { v4 as uuidv4 } from "uuid";

import { prisma } from "@calcom/prisma";

import { convertSvgToPng } from "../imageUtils";
import type { StorageService } from "./StorageService";

export class DatabaseStorageService implements StorageService {
  async uploadBanner({ teamId, data }: { teamId: number; data: string }): Promise<string> {
    const objectKey = uuidv4();
    const processedData = await convertSvgToPng(data);

    await prisma.avatar.upsert({
      where: {
        teamId_userId_isBanner: {
          teamId,
          userId: 0,
          isBanner: true,
        },
      },
      create: {
        teamId,
        data: processedData,
        objectKey,
        isBanner: true,
      },
      update: {
        data: processedData,
        objectKey,
      },
    });

    return `/api/avatar/${objectKey}.png`;
  }

  async uploadAvatar({ userId, data }: { userId: number; data: string }): Promise<string> {
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
  }

  async retrieveImage(objectKey: string): Promise<{ data: string; contentType: string }> {
    const avatar = await prisma.avatar.findUniqueOrThrow({
      where: { objectKey },
      select: { data: true },
    });

    return {
      data: avatar.data,
      contentType: "image/png",
    };
  }

  async deleteImage(objectKey: string): Promise<void> {
    await prisma.avatar.delete({
      where: { objectKey },
    });
  }
}
