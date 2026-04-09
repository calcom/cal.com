/**
 * Strips protocol, www, path, port, query, fragment, and lowercases.
 *
 * Examples:
 *   `https://www.acme.com/about/?ref=google#section` → `acme.com`
 *   `HTTP://ACME.COM:443/en/`                        → `acme.com`
 *   `acme.com`                                        → `acme.com` (no-op)
 */
export function normalizeWebsiteUrl(url: string): string {
  if (!url || typeof url !== "string") return "";

  let cleaned = url.trim().toLowerCase();
  if (!cleaned) return "";

  // Strip protocol (handle double-protocol typos like https://https://...)
  cleaned = cleaned.replace(/^(?:https?:\/\/)+/, "");

  // Strip www. prefix
  if (cleaned.startsWith("www.")) {
    cleaned = cleaned.slice(4);
  }

  // Strip everything after the host: path, query, fragment
  const slashIndex = cleaned.indexOf("/");
  if (slashIndex !== -1) {
    cleaned = cleaned.slice(0, slashIndex);
  }

  const questionIndex = cleaned.indexOf("?");
  if (questionIndex !== -1) {
    cleaned = cleaned.slice(0, questionIndex);
  }

  const hashIndex = cleaned.indexOf("#");
  if (hashIndex !== -1) {
    cleaned = cleaned.slice(0, hashIndex);
  }

  // Strip port
  const colonIndex = cleaned.lastIndexOf(":");
  if (colonIndex !== -1) {
    const afterColon = cleaned.slice(colonIndex + 1);
    if (/^\d+$/.test(afterColon)) {
      cleaned = cleaned.slice(0, colonIndex);
    }
  }

  // Strip trailing dot (DNS root notation)
  if (cleaned.endsWith(".")) {
    cleaned = cleaned.slice(0, -1);
  }

  return cleaned;
}
