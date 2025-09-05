export function getDefaultAvatar(logoUrl: string | null | undefined, name: string | null | undefined) {
  return (
    logoUrl ||
    `https://eu.ui-avatars.com/api/?background=fff&color=000000&bold=true&background=e5e7eb&name=${encodeURIComponent(
      name || ""
    )}`
  );
}
