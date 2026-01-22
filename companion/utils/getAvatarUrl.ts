import { z } from "zod";

const CAL_URL = "https://cal.com";
const AVATAR_FALLBACK = "/avatar.png";

/**
 * Base64 image data URL regex pattern
 * Matches: data:image/[type];base64,[base64data]
 */
const BASE64_IMAGE_REGEX =
  /^data:image\/[^;]+;base64,(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;

/**
 * Normalizes avatar URL to a format that can be used by React Native Image component.
 * Handles three formats:
 * 1. Absolute HTTPS URLs - returns as-is
 * 2. Base64 data URLs (data:image/...) - returns as-is
 * 3. Relative URLs (e.g., /api/avatar/[uuid]) - prefixes with CAL_URL
 *
 * @param avatarUrl - The avatar URL from the API (can be absolute URL, base64, or relative path)
 * @returns A normalized URL that can be used by React Native Image component, or fallback URL
 *
 * @example
 * getAvatarUrl("https://example.com/avatar.jpg") // "https://example.com/avatar.jpg"
 * getAvatarUrl("data:image/png;base64,iVBORw0KG...") // "data:image/png;base64,iVBORw0KG..."
 * getAvatarUrl("/api/avatar/123") // "https://cal.com/api/avatar/123"
 * getAvatarUrl(undefined) // "https://cal.com/avatar.png"
 */
export const getAvatarUrl = (avatarUrl: string | null | undefined): string => {
  if (!avatarUrl) {
    return CAL_URL + AVATAR_FALLBACK;
  }

  // Check if it's a base64 data URL
  if (BASE64_IMAGE_REGEX.test(avatarUrl)) {
    return avatarUrl;
  }

  // Check if it's already an absolute URL (HTTPS or HTTP)
  const isAbsoluteUrl = z.string().url().safeParse(avatarUrl).success;
  if (isAbsoluteUrl) {
    return avatarUrl;
  }

  // Treat as relative URL and prefix with CAL_URL
  // Ensure the relative URL starts with /
  const relativePath = avatarUrl.startsWith("/") ? avatarUrl : `/${avatarUrl}`;
  return CAL_URL + relativePath;
};
