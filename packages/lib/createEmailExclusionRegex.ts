/**
 * Creates a regular expression that can be used to exclude certain email addresses or domains.
 * The exclusion string can contain multiple comma-separated terms, which can be:
 *
 * 1. **Full email match** (e.g., "spammer@cal.com"): Matches the exact email address.
 * 2. **Domain match** (e.g., "gmail.com" or "@gmail.com"): Matches any email address with the specified domain.
 * 3. **Keyword match** (e.g., "spammer"): Matches any email address or domain that contains the specified keyword.
 *
 * The exclusion terms are processed and escaped for use in a regular expression, and the resulting
 * regex can match any email addresses or domains that match the exclusions specified.
 *
 * @param exclusionString - A comma-separated string containing terms to be excluded.
 *                          Each term can represent a full email address, domain, or keyword.
 * @returns A case-insensitive regular expression that matches any email address or domain
 *          matching the exclusions specified in the exclusionString.
 *
 * Example usage:
 *
 * const exclusionString = 'spammer@cal.com,gmail.com,spammer';
 *
 * const regex = createExclusionRegex(exclusionString);
 *
 * console.log(regex.test('spammer@cal.com'));  // true
 *
 * console.log(regex.test('user@gmail.com'));   // true
 *
 * console.log(regex.test('user@spammer.com')); // true
 *
 * console.log(regex.test('user@example.com')); // false
 */
export function createEmailExclusionRegex(exclusionString: string) {
  if (!exclusionString || !exclusionString.trim()) {
    return /.^/i;
  }

  const exclusions = exclusionString.split(",");
  // Escape each exclusion and join them with "|"
  const pattern = exclusions
    .map((exclusion) => {
      // Escape special characters in the exclusion term
      const escapedExclusion = exclusion.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

      if (escapedExclusion.includes("@")) {
        return `(^${escapedExclusion}$)|(@${escapedExclusion.replace("@", "")}$)`;
      } else {
        return `(@${escapedExclusion}$|@${escapedExclusion}\\b|^${escapedExclusion}$)`;
      }
    })
    .join("|");

  return new RegExp(pattern, "i");
}
