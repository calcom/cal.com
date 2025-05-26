import { oauth2_v2 } from "@googleapis/oauth2";
import type { OAuth2Client } from "googleapis-common";

import logger from "@calcom/lib/logger";
import { UserRepository } from "@calcom/lib/server/repository/user";

export async function updateProfilePhotoGoogle(oAuth2Client: OAuth2Client, userId: number) {
  try {
    const oauth2 = new oauth2_v2.Oauth2({ auth: oAuth2Client });
    const userDetails = await oauth2.userinfo.get();
    if (userDetails.data?.picture) {
      await UserRepository.updateAvatar({ id: userId, avatarUrl: userDetails.data.picture });
    }
  } catch (error) {
    logger.error("Error updating avatarUrl from google calendar connect", error);
  }
}
