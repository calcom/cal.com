/**
 * Serializes Next.js query objects while preserving repeated keys.
 *
 * Next.js query params can contain `string[]` values for repeated keys, and
 * `URLSearchParams` built from a record will otherwise collapse those arrays
 * into comma-joined strings.
 */
export function serializeNextQueryParams(query: Record<string, string | string[] | undefined>) {
  const searchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(query)) {
    if (value === undefined) {
      continue;
    }

    if (Array.isArray(value)) {
      for (const item of value) {
        searchParams.append(key, item);
      }
      continue;
    }

    searchParams.append(key, value);
  }

  return searchParams.toString();
}
