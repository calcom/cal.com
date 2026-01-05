import { oauth2_v2 } from "@googleapis/oauth2";
import type { OAuth2Client } from "googleapis-common";

import { UserRepository } from "@calcom/features/users/repositories/UserRepository";
import logger from "@calcom/lib/logger";
import { uploadAvatar } from "@calcom/lib/server/avatar";
import { resizeBase64Image } from "@calcom/lib/server/resizeBase64Image";
import prisma from "@calcom/prisma";

export async function updateProfilePhotoGoogle(oAuth2Client: OAuth2Client, userId: number) {
  try {
    const oauth2 = new oauth2_v2.Oauth2({ auth: oAuth2Client });
    const userDetails = await oauth2.userinfo.get();
    const avatarUrl = userDetails.data?.picture;
    if (!avatarUrl) {
      return;
    }

    // Handle base64 data
    if (
      avatarUrl.startsWith("data:image/png;base64,") ||
      avatarUrl.startsWith("data:image/jpeg;base64,") ||
      avatarUrl.startsWith("data:image/jpg;base64,")
    ) {
      const resizedAvatarUrl = await uploadAvatar({
        avatar: await resizeBase64Image(avatarUrl),
        userId,
      });
      const userRepo = new UserRepository(prisma);
      await userRepo.updateAvatar({ id: userId, avatarUrl: resizedAvatarUrl });
      return;
    }

    const userRepo = new UserRepository(prisma);
    await userRepo.updateAvatar({ id: userId, avatarUrl });
  } catch (error) {
    logger.error("Error updating avatarUrl from google calendar connect", error);
  }
}
