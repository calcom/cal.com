import type { KnownConfig } from "./types";

export const getErrorString = (errorCode: string | undefined) => {
  if (errorCode === "404") {
    return `Error Code: 404. Cal Link seems to be wrong.`;
  } else {
    return `Error Code: ${errorCode}. Something went wrong.`;
  }
};

/**
 * An alternative to Object.fromEntries that allows duplicate keys and converts the values corresponding to them in an array
 *
 * NOTE: This is a duplicate of the function in @calcom/lib/hooks/useRouterQuery.ts. It has to be here because embed is published to npm and shouldn't refer to any private package
 */
export function fromEntriesWithDuplicateKeys(entries: IterableIterator<[string, string]> | null) {
  const result: Record<string, string | string[]> = {};

  if (entries === null) {
    return result;
  }

  // Consider setting atleast ES2015 as target
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  for (const [key, value] of entries) {
    if (result.hasOwnProperty(key)) {
      let currentValue = result[key];
      if (!Array.isArray(currentValue)) {
        currentValue = [currentValue];
      }
      currentValue.push(value);
      result[key] = currentValue;
    } else {
      result[key] = value;
    }
  }
  return result;
}

function listKnownConfigProps() {
  const knownConfigProps: (keyof KnownConfig)[] = [
    "flag.coep",
    "layout",
    "ui.color-scheme",
    "theme",
    "cal.embed.pageType",
  ];
  return knownConfigProps;
}

export function getConfigProp<TProp extends keyof KnownConfig>(config: KnownConfig, prop: TProp) {
  const knownConfigProps = listKnownConfigProps();
  if (!knownConfigProps.includes(prop)) {
    console.warn(`Not reading unknown config prop: ${prop}`);
    return null;
  }
  return config[prop] ?? null;
}

export function getQueryParamProvidedByConfig<TProp extends keyof KnownConfig>(
  queryParam: TProp
): NonNullable<KnownConfig[TProp]> | null {
  const knownConfigProps = listKnownConfigProps();
  if (!knownConfigProps.includes(queryParam)) {
    console.warn(`Not reading unknown config prop from query: ${queryParam}`);
    return null;
  }
  const url = new URL(document.URL);
  const value = url.searchParams.get(queryParam);
  if (typeof value === "string") {
    return value as NonNullable<KnownConfig[TProp]>;
  }
  return value;
}

function hyphenate(str: string): string {
  return str.charAt(0).toLowerCase() + str.slice(1).replace(/[A-Z]/g, (match) => `-${match.toLowerCase()}`);
}

/**
 * Escapes special characters in HTML attribute values to prevent XSS
 * @param value The string to escape
 * @returns Escaped string safe for use in HTML attributes
 */
function escapeHtmlAttribute(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export function generateDataAttributes(props: Record<string, string | null | undefined>): string {
  return Object.entries(props)
    .filter((pair): pair is [string, string] => !!pair[1])
    .map(([key, value]) => `data-${hyphenate(key)}="${escapeHtmlAttribute(value)}"`)
    .join(" ");
}
