// we want to invert all logos that contain -dark in their name
// we don't want to invert logos that are not coming from the app-store

export default function invertLogoOnDark(
  url?: string,
  // The background color of the logo's display location is opposite of the general theme of the application.
  // Ex. General App theme is black but the logo's background color is white.
  opposite?: boolean
) {
  return url?.includes("-dark") || !url?.startsWith("/app-store")
    ? opposite
      ? "invert dark:invert-0"
      : "dark:invert"
    : "";
}
