export function isOriginAllowed(origin: string, allowedOrigins: string[]): boolean {
  return allowedOrigins.some((allowedOrigin) => {
    if (allowedOrigin.includes("*")) {
      return wildcardToRegex(allowedOrigin).test(origin);
    }
    return origin === allowedOrigin;
  });
}

function wildcardToRegex(pattern: string): RegExp {
  const escaped = escapeRegex(pattern);
  const regexPattern = "^" + escaped.replace(/\\\*/g, ".*") + "$";
  return new RegExp(regexPattern);
}

function escapeRegex(str: string): string {
  return str.replace(/[.+*?^${}()|[\]\\]/g, "\\$&");
}
