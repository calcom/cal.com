import { UserRepository } from "@calcom/features/users/repositories/UserRepository";
import logger from "@calcom/lib/logger";
import { uploadAvatar } from "@calcom/lib/server/avatar";
import { resizeBase64Image } from "@calcom/lib/server/resizeBase64Image";
import prisma from "@calcom/prisma";

export async function updateProfilePhotoMicrosoft(accessToken: string, userId: number) {
  logger.info("updateProfilePhotoMicrosoft called", { userId, hasToken: !!accessToken });
  try {
    const response = await fetch("https://graph.microsoft.com/v1.0/me/photo/$value", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      // in case user might not have a profile photo set
      if (response.status === 404) {
        logger.info("Microsoft profile photo not found for user", { userId });
        return;
      }
      logger.error("Failed to fetch Microsoft profile photo", {
        userId,
        status: response.status,
        statusText: response.statusText,
      });
      return;
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const contentType = response.headers.get("content-type") || "image/jpeg";
    const base64Image = `data:${contentType};base64,${buffer.toString("base64")}`;

    const resizedAvatarUrl = await uploadAvatar({
      avatar: await resizeBase64Image(base64Image),
      userId,
    });

    const userRepo = new UserRepository(prisma);
    await userRepo.updateAvatar({ id: userId, avatarUrl: resizedAvatarUrl });
    logger.info("Microsoft profile photo updated successfully", { userId });
  } catch (error) {
    logger.error("Error updating avatarUrl from Microsoft sign-in", error);
  }
}
