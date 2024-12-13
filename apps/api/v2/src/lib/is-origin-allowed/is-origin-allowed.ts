export function isOriginAllowed(origin: string, allowedOrigins: string[]): boolean {
  for (const allowedOrigin of allowedOrigins) {
    if (allowedOrigin.includes("*")) {
      const regex = wildcardToRegex(allowedOrigin);
      if (regex.test(origin)) {
        return true;
      }
    } else {
      if (origin === allowedOrigin) {
        return true;
      }
    }
  }
  return false;
}

function wildcardToRegex(pattern: string): RegExp {
  const escaped = escapeRegex(pattern);
  const regexPattern = "^" + escaped.replace(/\\\*/g, ".*") + "$";
  return new RegExp(regexPattern);
}

function escapeRegex(str: string): string {
  return str.replace(/[.+*?^${}()|[\]\\]/g, "\\$&");
}
