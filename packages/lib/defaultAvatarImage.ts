import md5Parser from "md5";

export const defaultAvatarSrc = function ({ email, md5 }: { md5?: string; email?: string }) {
  if (!email && !md5) return "";

  if (email && !md5) {
    md5 = md5Parser(email);
  }

  return `https://www.gravatar.com/avatar/${md5}?s=160&d=mp&r=PG`;
};

export function getPlaceholderAvatar(avatar: string | null | undefined, name: string | null) {
  return avatar
    ? avatar
    : "https://eu.ui-avatars.com/api/?background=fff&color=f9f9f9&bold=true&background=000000&name=" +
        encodeURIComponent(name || "");
}
