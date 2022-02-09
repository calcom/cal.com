import crypto from "crypto";

export const defaultAvatarSrc = function ({ email, md5 }: { md5?: string; email?: string }) {
  if (!email && !md5) return "";

  if (email && !md5) {
    md5 = crypto.createHash("md5").update(email).digest("hex");
  }

  return `https://www.gravatar.com/avatar/${md5}?s=160&d=identicon&r=PG`;
};
