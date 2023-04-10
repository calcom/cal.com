import md5Parser from "md5";

/**
 * Provided either an email or an MD5 hash, return the URL for the Gravatar
 * image aborting early if neither is provided.
 */
export const defaultAvatarSrc = function ({ email, md5 }: { md5?: string; email?: string }) {
  if (!email && !md5) return "";

  if (email && !md5) {
    md5 = md5Parser(email);
  }

  return `https://www.gravatar.com/avatar/${md5}?s=160&d=mp&r=PG`;
};

/**
 * Given an avatar URL and a name, return the appropriate avatar URL. In the
 * event that no avatar URL is provided, return a placeholder avatar URL from
 * ui-avatars.com.
 *
 * ui-avatars.com is a free service that generates placeholder avatars based on
 * a name. It is used here to provide a consistent placeholder avatar for users
 * who have not uploaded an avatar.
 */
export function getPlaceholderAvatar(avatar: string | null | undefined, name: string | null) {
  return avatar
    ? avatar
    : "https://eu.ui-avatars.com/api/?background=fff&color=f9f9f9&bold=true&background=000000&name=" +
        encodeURIComponent(name || "");
}
