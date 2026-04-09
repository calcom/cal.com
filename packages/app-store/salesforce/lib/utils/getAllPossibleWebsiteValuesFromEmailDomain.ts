/**
 * Returns an array of possible Account.Website values that should match the given
 * email domain in a SOQL `WHERE Website IN (...)` query.
 *
 * These are exact-match variants only. Messy Website values (paths, ports, mixed
 * case) are handled by `findAccountByNormalizedWebsite` as a separate fallback.
 */
export default function getAllPossibleWebsiteValuesFromEmailDomain(emailDomain: string): string[] {
  return [
    emailDomain,
    `www.${emailDomain}`,
    `http://www.${emailDomain}`,
    `http://${emailDomain}`,
    `https://www.${emailDomain}`,
    `https://${emailDomain}`,
  ];
}
