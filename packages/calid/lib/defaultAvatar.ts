export function getDefaultAvatar(logoUrl: string | null | undefined, name: string | null | undefined) {
  return (
    logoUrl ||
    `https://eu.ui-avatars.com/api/?background=fff&color=000000&bold=true&background=f6f7f9&name=${encodeURIComponent(
      name || ""
    )}`
  );
}
