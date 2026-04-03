export function getTargetOrigin(redirectUri: string | null): string | null {
  if (!redirectUri) return null;
  try {
    return new URL(redirectUri).origin;
  } catch {
    return null;
  }
}
