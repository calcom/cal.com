import { oauth2_v2 } from "@googleapis/oauth2";
import type { OAuth2Client } from "googleapis-common";

import logger from "@calcom/lib/logger";
import { UserRepository } from "@calcom/lib/server/repository/user";

const MAX_AVATAR_URL_LENGTH = 10000;

export async function updateProfilePhotoGoogle(oAuth2Client: OAuth2Client, userId: number) {
  try {
    const oauth2 = new oauth2_v2.Oauth2({ auth: oAuth2Client });
    const userDetails = await oauth2.userinfo.get();
    const avatarUrl = userDetails.data?.picture;
    if (!avatarUrl) {
      return;
    }

    // Check avatar URL length before processing
    if (avatarUrl.length > MAX_AVATAR_URL_LENGTH) {
      logger.warn(
        `Avatar URL too long (${avatarUrl.length} characters), skipping processing for user ${userId}`
      );
      return;
    }

    await UserRepository.updateAvatar({ id: userId, avatarUrl });
  } catch (error) {
    logger.error("Error updating avatarUrl from google calendar connect", error);
  }
}
