import crypto from "crypto";

export const defaultAvatarSrc = function ({ email, md5 }: { md5?: string; email?: string }) {
  return `https://www.gravatar.com/avatar/?s=160&d=identicon&r=PG`;
};
