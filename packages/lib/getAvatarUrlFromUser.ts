import { WEBAPP_URL } from "./constants";
import { defaultAvatarSrc } from "./defaultAvatarImage";

/** This helps to prevent reaching the 4MB payload limit by avoiding base64 and instead passing the avatar url */
export function getAvatarUrlFromUser(user: {
  avatar: string | null;
  username: string | null;
  email: string;
}) {
  if (!user.avatar || !user.username) return defaultAvatarSrc({ email: user.email });
  return `${WEBAPP_URL}/${user.username}/avatar.png`;
}
