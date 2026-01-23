/**
 * Extracts the first name from a user's name.
 * If givenName is provided and not empty, it is used directly.
 * Otherwise, the first word of the full name is extracted.
 *
 * @param name - The full name to extract from
 * @param givenName - Optional given name that takes precedence if provided
 * @returns The first name, or empty string if no name is available
 */
export function getFirstName(name: string | null | undefined, givenName?: string | null): string {
  if (givenName) {
    return givenName;
  }

  if (!name) {
    return "";
  }

  return name.split(" ")[0];
}
