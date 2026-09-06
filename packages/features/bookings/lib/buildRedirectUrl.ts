export function buildRedirectUrl(destinationUrl: string, incomingParams: Record<string, string>): string {
  const url = new URL(destinationUrl);
  Object.entries(incomingParams).forEach(([key, value]) => {
    if (!url.searchParams.has(key)) {
      url.searchParams.set(key, value);
    }
  });
  return url.toString();
}
