import { oauth2_v2 } from "@googleapis/oauth2";
import type { OAuth2Client } from "googleapis-common";

import { isBase64Image } from "@calcom/lib/isBase64Image";
import logger from "@calcom/lib/logger";
import { uploadAvatar } from "@calcom/lib/server/avatar";
import { UserRepository } from "@calcom/lib/server/repository/user";
import { resizeBase64Image } from "@calcom/lib/server/resizeBase64Image";

export async function updateProfilePhotoGoogle(oAuth2Client: OAuth2Client, userId: number) {
  try {
    const oauth2 = new oauth2_v2.Oauth2({ auth: oAuth2Client });
    const userDetails = await oauth2.userinfo.get();
    const avatarUrl = userDetails.data?.picture;
    if (!avatarUrl) {
      return;
    }

    // Handle base64 data
    if (isBase64Image(avatarUrl)) {
      const resizedAvatarUrl = await uploadAvatar({
        avatar: await resizeBase64Image(avatarUrl),
        userId,
      });
      await UserRepository.updateAvatar({ id: userId, avatarUrl: resizedAvatarUrl });
      return;
    }

    // Handle valid URLs
    if (avatarUrl.startsWith("http://") || avatarUrl.startsWith("https://")) {
      await UserRepository.updateAvatar({ id: userId, avatarUrl });
      return;
    }
  } catch (error) {
    logger.error("Error updating avatarUrl from google calendar connect", error);
  }
}
