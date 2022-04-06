import { User } from "@prisma/client";

export function isBrandingHidden<TUser extends Pick<User, "hideBranding" | "plan">>(user: TUser) {
  return user.hideBranding && user.plan !== "FREE";
}
