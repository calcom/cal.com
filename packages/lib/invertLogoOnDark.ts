// we want to invert all logos that contain -dark in their name
// we don't want to invert logos that are not coming from the app-store

export default function invertLogoOnDark(url?: string) {
  return (url?.includes("-dark") || !url?.startsWith("/app-store")) && "dark:invert";
}
