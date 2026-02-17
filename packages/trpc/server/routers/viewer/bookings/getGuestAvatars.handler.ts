import { getAvatarUrlFromAvatarAPI } from "@calcom/features/avatars/getAvatarUrlFromAvatarAPI";
import type { TGetGuestAvatarsInputSchema } from "./getGuestAvatars.schema";

type GetGuestAvatarsOptions = {
  input: TGetGuestAvatarsInputSchema;
};

export const getGuestAvatarsHandler = async ({ input }: GetGuestAvatarsOptions) => {
  const results = await Promise.all(
    input.emails.map(async (email) => {
      const avatarUrl = await getAvatarUrlFromAvatarAPI(email);
      return { email, avatarUrl };
    })
  );

  const avatarMap: Record<string, string> = {};
  for (const result of results) {
    if (result.avatarUrl) {
      avatarMap[result.email] = result.avatarUrl;
    }
  }

  return avatarMap;
};
