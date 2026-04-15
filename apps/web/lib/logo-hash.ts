type LogoType =
  | "logo"
  | "icon"
  | "favicon-16"
  | "favicon-32"
  | "apple-touch-icon"
  | "mstile"
  | "android-chrome-192"
  | "android-chrome-256";

const VALID_LOGO_TYPES: ReadonlySet<string> = new Set<string>([
  "logo",
  "icon",
  "favicon-16",
  "favicon-32",
  "apple-touch-icon",
  "mstile",
  "android-chrome-192",
  "android-chrome-256",
]);

function getLogoHashes(): Record<string, string> {
  try {
    return JSON.parse(process.env.NEXT_PUBLIC_LOGO_HASHES || "{}") as Record<string, string>;
  } catch {
    return {};
  }
}

function isValidLogoType(type: string): type is LogoType {
  return VALID_LOGO_TYPES.has(type);
}

function getLogoHash(type: LogoType): string {
  return getLogoHashes()[type] || "";
}

function getLogoUrl(type: LogoType): string {
  const hash = getLogoHash(type);
  if (hash) {
    return `/api/logo?type=${type}&v=${hash}`;
  }
  return `/api/logo?type=${type}`;
}

export { getLogoHash, getLogoHashes, getLogoUrl, isValidLogoType };
export type { LogoType };
