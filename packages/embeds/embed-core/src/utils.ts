import type { EmbedThemeConfig } from "./types";

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

function detectColorScheme() {
  if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
    return "dark";
  }
  return "light";
}

function getClassBasedOnTheme(theme: "dark" | "light") {
  if (theme === "dark") {
    return "dark";
  }
  return "";
}

export function getThemeClassForEmbed({
  themeFromConfig,
}: {
  themeFromConfig: EmbedThemeConfig | undefined | null;
}) {
  const systemTheme = detectColorScheme();
  const isThemePreferenceProvided = themeFromConfig === "dark" || themeFromConfig === "light";
  if (isThemePreferenceProvided) {
    return getClassBasedOnTheme(themeFromConfig);
  }
  return getClassBasedOnTheme(systemTheme);
}
