/**
 * Creates a replacer function with the redaction keys captured in a closure.
 * This avoids the need for explicit 'bind'.
 *
 * @param keysToRedactSet - A Set containing the string keys to redact.
 * @returns A replacer function suitable for JSON.stringify.
 */
export function createReplacer(keysToRedactSet: Set<string>): (key: string, value: any) => any {
  return function (key: string, value: any): any {
    if (keysToRedactSet.has(key)) {
      // Omit the key-value pair if the key is in the set.
      return undefined;
    }
    // Keep the value otherwise.
    return value;
  };
}
